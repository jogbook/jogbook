// Public checkout endpoint for clients paying a JogBook booking.
// GET  ?token=<booking access token>          -> booking + payment summary
// POST { token, payment_type, method, currency } -> creates a payment row and
//                                                   returns the provider checkout
//
// No payment is ever marked PAID here. Only the verified webhook does that.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getSettings, json, serviceClient } from "../_shared/db.ts";
import { recomputeBookingState } from "../_shared/ledger.ts";
import { commissionSplit, round2 } from "../_shared/money.ts";
import { quote } from "../_shared/fx.ts";
import { availableMethods, providerForMethod } from "../_shared/providers/index.ts";
import { ProviderNotConfiguredError, ProviderRequestError, type PaymentMethod, type PaymentType } from "../_shared/types.ts";

const METHODS: PaymentMethod[] = ["CARD", "PAYPAL", "USDC", "USDT", "SOL", "ETH", "BTC"];
const TYPES: PaymentType[] = ["DEPOSIT", "BALANCE", "FULL"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const reply = (body: unknown, status = 200) =>
  json(body, status, corsHeaders as unknown as Record<string, string>);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = serviceClient();

  try {
    const url = new URL(req.url);
    const settings = await getSettings(supabase);
    const enabled = settings.supported_payment_methods as PaymentMethod[];
    const configured = availableMethods();

    // ---------- Summary ----------
    if (req.method === "GET") {
      const token = url.searchParams.get("token") ?? "";
      if (!UUID.test(token)) return reply({ error: "Invalid booking link" }, 400);

      const { data: booking } = await supabase
        .from("booking_requests")
        .select(
          "id, client_name, client_email, event_date, event_type, message, status, booking_currency, performance_fee, deposit_type, deposit_value, deposit_amount, balance_amount, amount_paid, payment_deadline, terms, payment_state, gig_state, dj_id",
        )
        .eq("access_token", token)
        .maybeSingle();
      if (!booking) return reply({ error: "Booking not found" }, 404);

      const { data: dj } = await supabase
        .from("profiles")
        .select("id, name, stage_name, slug, avatar_url, photo_url, location")
        .eq("id", booking.dj_id)
        .maybeSingle();

      const { data: payments } = await supabase
        .from("payments")
        .select("id, payment_type, amount, currency, booking_amount, booking_currency, payment_method, payment_status, crypto_asset, created_at, paid_at")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: false });

      return reply({
        booking,
        dj,
        payments: payments ?? [],
        settings: {
          supported_currencies: settings.supported_currencies,
          methods: METHODS.filter((m) => enabled.includes(m)).map((m) => ({
            method: m,
            available: !!configured[m],
          })),
        },
      });
    }

    if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

    // ---------- Create checkout ----------
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const token = String(body.token ?? "");
    const paymentType = String(body.payment_type ?? "") as PaymentType;
    const method = String(body.method ?? "") as PaymentMethod;

    if (!UUID.test(token)) return reply({ error: "Invalid booking link" }, 400);
    if (!TYPES.includes(paymentType)) return reply({ error: "Invalid payment type" }, 400);
    if (!METHODS.includes(method)) return reply({ error: "Invalid payment method" }, 400);
    if (!enabled.includes(method)) return reply({ error: `${method} payments are not enabled` }, 400);

    const { data: existingBooking } = await supabase
      .from("booking_requests")
      .select("id")
      .eq("access_token", token)
      .maybeSingle();
    if (!existingBooking) return reply({ error: "Booking not found" }, 404);

    // Recompute from settled payments first so the outstanding amount is never stale.
    const booking =
      (await recomputeBookingState(supabase, existingBooking.id)) ??
      (
        await supabase.from("booking_requests").select("*").eq("id", existingBooking.id).maybeSingle()
      ).data;
    if (!booking) return reply({ error: "Booking not found" }, 404);
    if (booking.status !== "accepted") {
      return reply({ error: "This booking has not been accepted by the DJ yet" }, 400);
    }
    if (booking.payment_state === "PAYMENT_COMPLETE") {
      return reply({ error: "This booking is already paid in full" }, 400);
    }

    const fee = Number(booking.performance_fee ?? 0);
    if (fee <= 0) return reply({ error: "The DJ has not set the performance fee yet" }, 400);

    const alreadyPaid = Number(booking.amount_paid ?? 0);
    const depositAmount = Number(booking.deposit_amount ?? 0);
    const outstanding = round2(fee - alreadyPaid);

    let bookingAmount: number;
    if (paymentType === "FULL") {
      bookingAmount = outstanding;
    } else if (paymentType === "DEPOSIT") {
      if (booking.deposit_payment_status === "PAID" || alreadyPaid > 0) {
        return reply({ error: "The deposit has already been paid" }, 400);
      }
      bookingAmount = Math.min(depositAmount || outstanding, outstanding);
    } else {
      if (outstanding <= 0) return reply({ error: "There is no balance outstanding" }, 400);
      bookingAmount = outstanding;
    }
    if (bookingAmount <= 0) return reply({ error: "Nothing left to pay" }, 400);


    // Crypto is always quoted against the booking currency by the provider.
    const payCurrency = (
      method === "CARD" || method === "PAYPAL"
        ? String(body.currency ?? booking.booking_currency)
        : booking.booking_currency
    ).toUpperCase();
    if (!settings.supported_currencies.includes(payCurrency)) {
      return reply({ error: `${payCurrency} is not a supported currency` }, 400);
    }

    const { amount: payAmount, rate } = await quote(bookingAmount, booking.booking_currency, payCurrency);

    // Reuse an open payment for the same type/method instead of creating duplicates.
    const { data: openPayment } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", booking.id)
      .eq("payment_type", paymentType)
      .in("payment_status", ["PENDING", "PROCESSING"])
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (openPayment && openPayment.payment_method === method && openPayment.provider_checkout_url) {
      return reply({
        payment_id: openPayment.id,
        checkout_url: openPayment.provider_checkout_url,
        crypto: openPayment.crypto_address
          ? {
              asset: openPayment.crypto_asset,
              network: openPayment.crypto_network,
              amount: openPayment.crypto_amount,
              address: openPayment.crypto_address,
            }
          : null,
        reused: true,
      });
    }

    const provider = providerForMethod(method);
    if (!provider.isConfigured()) {
      return reply(
        {
          error: `${method} payments are not connected yet.`,
          missing_secrets: provider.missingSecrets(),
          provider: provider.id,
        },
        503,
      );
    }

    // Payout routing: with IMMEDIATE timing we use a destination charge so the
    // DJ's share never sits on a JogBook balance.
    const { data: account } = await supabase
      .from("payout_accounts")
      .select("connected_account_id, payouts_enabled, provider")
      .eq("dj_id", booking.dj_id)
      .maybeSingle();

    const useDestinationCharge =
      settings.payout_timing === "IMMEDIATE" &&
      !!account?.payouts_enabled &&
      account.provider === provider.id;

    const { platformFee } = commissionSplit(payAmount, settings.commission_percent);

    const { data: payment, error: insertError } = await supabase
      .from("payments")
      .insert({
        booking_id: booking.id,
        dj_id: booking.dj_id,
        client_user_id: booking.client_user_id,
        client_email: booking.client_email,
        payment_type: paymentType,
        booking_amount: bookingAmount,
        booking_currency: booking.booking_currency,
        amount: payAmount,
        currency: payCurrency,
        exchange_rate: rate,
        payment_method: method,
        payment_status: "PENDING",
        provider: provider.id,
        metadata: {
          destination_charge: useDestinationCharge,
          platform_fee_percent: settings.commission_percent,
        },
      })
      .select()
      .single();
    if (insertError) throw new Error(`Failed to create payment: ${insertError.message}`);

    const origin = String(body.origin ?? url.origin);
    const result = await provider.createCheckout({
      paymentId: payment.id,
      bookingId: booking.id,
      description: `${booking.event_type} booking — ${paymentType === "BALANCE" ? "balance" : paymentType === "FULL" ? "full payment" : "deposit"}`,
      amount: payAmount,
      currency: payCurrency,
      method,
      customerEmail: booking.client_email,
      successUrl: `${origin}/pay/${token}?status=success&payment=${payment.id}`,
      cancelUrl: `${origin}/pay/${token}?status=cancelled&payment=${payment.id}`,
      connectedAccountId: useDestinationCharge ? account?.connected_account_id : null,
      applicationFeeAmount: useDestinationCharge ? platformFee : undefined,
      metadata: { booking_id: booking.id, dj_id: booking.dj_id, payment_type: paymentType },
    });

    await supabase
      .from("payments")
      .update({
        provider_payment_id: result.providerPaymentId,
        provider_checkout_url: result.checkoutUrl ?? null,
        crypto_asset: result.cryptoAsset ?? null,
        crypto_network: result.cryptoNetwork ?? null,
        crypto_amount: result.cryptoAmount ?? null,
        crypto_address: result.cryptoAddress ?? null,
        exchange_rate: result.exchangeRate ?? rate,
        confirmation_status: result.confirmationStatus ?? null,
      })
      .eq("id", payment.id);

    return reply({
      payment_id: payment.id,
      checkout_url: result.checkoutUrl ?? null,
      crypto: result.cryptoAddress
        ? {
            asset: result.cryptoAsset,
            network: result.cryptoNetwork,
            amount: result.cryptoAmount,
            address: result.cryptoAddress,
          }
        : null,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof ProviderNotConfiguredError) {
      return reply({ error: err.message }, 503);
    }
    if (err instanceof ProviderRequestError) {
      return reply({ error: "Payment provider request failed", details: err.body }, err.status);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("checkout error:", message);
    return reply({ error: message }, 500);
  }
});
