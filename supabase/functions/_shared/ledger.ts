// The JogBook payment/payout state machine.
// Everything here runs server-side only and is safe to call twice: webhook
// processing must be idempotent.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { commissionSplit, round2 } from "./money.ts";
import { getSettings } from "./db.ts";
import { activePayoutProvider } from "./providers/index.ts";
import type { NormalisedEvent } from "./types.ts";

/** Recomputes booking totals from the PAID payments only. */
export async function recomputeBookingState(supabase: SupabaseClient, bookingId: string) {
  const { data: booking } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return null;

  const { data: payments } = await supabase
    .from("payments")
    .select("amount, booking_amount, payment_status, payment_type")
    .eq("booking_id", bookingId);

  const paid = (payments ?? []).filter((p) => p.payment_status === "PAID");
  const refunded = (payments ?? []).filter((p) => p.payment_status === "REFUNDED");
  // Booking-currency amounts are canonical for accounting.
  const amountPaid = round2(paid.reduce((sum, p) => sum + Number(p.booking_amount), 0));
  const fee = Number(booking.performance_fee ?? 0);

  let paymentState: string;
  if (paid.length === 0) {
    paymentState = refunded.length > 0 ? "REFUNDED" : "UNPAID";
  } else if (fee > 0 && amountPaid >= fee - 0.01) {
    paymentState = "PAYMENT_COMPLETE";
  } else if (booking.gig_state === "GIG_COMPLETED" || booking.balance_requested_at) {
    paymentState = "BALANCE_DUE";
  } else {
    paymentState = "DEPOSIT_PAID";
  }

  const gigState =
    booking.gig_state === "PENDING" && paid.length > 0 ? "CONFIRMED" : booking.gig_state;

  const { data: updated } = await supabase
    .from("booking_requests")
    .update({ amount_paid: amountPaid, payment_state: paymentState, gig_state: gigState })
    .eq("id", bookingId)
    .select()
    .maybeSingle();

  return updated;
}

/**
 * Creates the payout row for a settled payment (one payout per payment,
 * enforced by a unique index) and applies the configured payout timing.
 */
export async function ensurePayoutForPayment(supabase: SupabaseClient, paymentId: string) {
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.payment_status !== "PAID") return null;

  const { data: existing } = await supabase
    .from("payouts")
    .select("*")
    .eq("payment_id", paymentId)
    .maybeSingle();
  if (existing) return existing;

  const settings = await getSettings(supabase);
  const gross = Number(payment.booking_amount);
  const { platformFee, netAmount } = commissionSplit(gross, settings.commission_percent);

  const { data: account } = await supabase
    .from("payout_accounts")
    .select("*")
    .eq("dj_id", payment.dj_id)
    .maybeSingle();

  const { data: booking } = await supabase
    .from("booking_requests")
    .select("gig_state")
    .eq("id", payment.booking_id)
    .maybeSingle();

  // A destination charge already routed the DJ's share at capture time.
  const settledAtCapture = payment.metadata?.destination_charge === true;

  const eligibleNow =
    settings.payout_timing === "IMMEDIATE" ||
    (settings.payout_timing === "ON_GIG_COMPLETE" && booking?.gig_state === "GIG_COMPLETED");

  const payoutStatus = settledAtCapture
    ? "PAID"
    : account?.payouts_enabled && eligibleNow
    ? "PENDING"
    : "NOT_ELIGIBLE";

  const { data: payout, error } = await supabase
    .from("payouts")
    .insert({
      booking_id: payment.booking_id,
      dj_id: payment.dj_id,
      payment_id: payment.id,
      gross_amount: gross,
      platform_fee: platformFee,
      platform_fee_percent: settings.commission_percent,
      net_amount: netAmount,
      currency: payment.booking_currency,
      payout_status: payoutStatus,
      provider: account?.provider ?? "stripe",
      connected_account_id: account?.connected_account_id ?? null,
      provider_payout_id: settledAtCapture ? payment.provider_payment_id : null,
      eligible_at: eligibleNow ? new Date().toISOString() : null,
      paid_at: settledAtCapture ? payment.paid_at : null,
    })
    .select()
    .maybeSingle();

  if (error) {
    // Unique violation = another webhook delivery already created it.
    if (error.code === "23505") {
      const { data: raced } = await supabase
        .from("payouts")
        .select("*")
        .eq("payment_id", paymentId)
        .maybeSingle();
      return raced;
    }
    throw new Error(`Failed to create payout: ${error.message}`);
  }

  if (payout && payout.payout_status === "PENDING") {
    await releasePayout(supabase, payout.id);
  }
  return payout;
}

/** Sends an eligible payout to the DJ's connected account via the provider. */
export async function releasePayout(supabase: SupabaseClient, payoutId: string) {
  const { data: payout } = await supabase
    .from("payouts")
    .select("*")
    .eq("id", payoutId)
    .maybeSingle();
  if (!payout) throw new Error("Payout not found");
  if (["PROCESSING", "PAID"].includes(payout.payout_status)) return payout;
  if (!payout.connected_account_id) {
    await supabase
      .from("payouts")
      .update({ payout_status: "NOT_ELIGIBLE", failure_reason: "DJ has no connected payout account" })
      .eq("id", payoutId);
    return payout;
  }

  const provider = activePayoutProvider();
  if (!provider.isConfigured()) {
    await supabase
      .from("payouts")
      .update({
        payout_status: "PENDING",
        eligible_at: new Date().toISOString(),
        failure_reason: `Awaiting provider credentials: ${provider.missingSecrets().join(", ")}`,
      })
      .eq("id", payoutId);
    return payout;
  }

  try {
    const result = await provider.createTransfer({
      connectedAccountId: payout.connected_account_id,
      amount: Number(payout.net_amount),
      currency: payout.currency,
      payoutId: payout.id,
      metadata: { booking_id: payout.booking_id, dj_id: payout.dj_id, description: "JogBook DJ earnings" },
    });
    const { data } = await supabase
      .from("payouts")
      .update({
        payout_status: result.status,
        provider_payout_id: result.providerPayoutId,
        failure_reason: null,
      })
      .eq("id", payoutId)
      .select()
      .maybeSingle();
    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Payout ${payoutId} failed: ${message}`);
    await supabase
      .from("payouts")
      .update({ payout_status: "FAILED", failure_reason: message })
      .eq("id", payoutId);
    throw err;
  }
}

/** Marks eligible payouts for a booking as releasable (used on gig completion). */
export async function markBookingPayoutsEligible(supabase: SupabaseClient, bookingId: string) {
  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, payout_status, connected_account_id")
    .eq("booking_id", bookingId)
    .eq("payout_status", "NOT_ELIGIBLE");

  for (const payout of payouts ?? []) {
    if (!payout.connected_account_id) continue;
    await supabase
      .from("payouts")
      .update({ payout_status: "PENDING", eligible_at: new Date().toISOString() })
      .eq("id", payout.id);
    try {
      await releasePayout(supabase, payout.id);
    } catch {
      // Failure is recorded on the payout row; keep processing the rest.
    }
  }
}

/** Applies a verified provider event to the ledger. Safe to run repeatedly. */
export async function applyEvent(supabase: SupabaseClient, event: NormalisedEvent) {
  // Resolve the payment row from our own id first, then the provider id.
  let payment: Record<string, any> | null = null;
  if (event.paymentId) {
    const { data } = await supabase.from("payments").select("*").eq("id", event.paymentId).maybeSingle();
    payment = data;
  }
  if (!payment && event.providerPaymentId) {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("provider", event.provider)
      .eq("provider_payment_id", event.providerPaymentId)
      .maybeSingle();
    payment = data;
  }

  switch (event.kind) {
    case "payment_processing": {
      if (!payment || payment.payment_status === "PAID") break;
      await supabase
        .from("payments")
        .update({
          payment_status: "PROCESSING",
          provider_payment_id: payment.provider_payment_id ?? event.providerPaymentId,
          confirmation_status: event.confirmationStatus ?? payment.confirmation_status,
          crypto_amount: event.cryptoAmount ?? payment.crypto_amount,
          transaction_hash: event.transactionHash ?? payment.transaction_hash,
        })
        .eq("id", payment.id);
      break;
    }
    case "payment_succeeded": {
      if (!payment) break;
      if (payment.payment_status !== "PAID") {
        await supabase
          .from("payments")
          .update({
            payment_status: "PAID",
            paid_at: new Date().toISOString(),
            provider_payment_id: payment.provider_payment_id ?? event.providerPaymentId,
            confirmation_status: event.confirmationStatus ?? "CONFIRMED",
            crypto_amount: event.cryptoAmount ?? payment.crypto_amount,
            crypto_asset: event.cryptoAsset ?? payment.crypto_asset,
            crypto_network: event.cryptoNetwork ?? payment.crypto_network,
            transaction_hash: event.transactionHash ?? payment.transaction_hash,
            exchange_rate: event.exchangeRate ?? payment.exchange_rate,
            failure_reason: null,
          })
          .eq("id", payment.id);
      }
      await recomputeBookingState(supabase, payment.booking_id);
      await ensurePayoutForPayment(supabase, payment.id);
      break;
    }
    case "payment_failed": {
      if (!payment || payment.payment_status === "PAID") break;
      await supabase
        .from("payments")
        .update({
          payment_status: "FAILED",
          failure_reason: event.failureReason ?? event.eventType,
          confirmation_status: event.confirmationStatus ?? payment.confirmation_status,
        })
        .eq("id", payment.id);
      await recomputeBookingState(supabase, payment.booking_id);
      break;
    }
    case "payment_refunded": {
      if (!payment || payment.payment_status === "REFUNDED") break;
      await supabase
        .from("payments")
        .update({ payment_status: "REFUNDED", refunded_at: new Date().toISOString() })
        .eq("id", payment.id);
      await supabase
        .from("payouts")
        .update({ payout_status: "REVERSED", failure_reason: "Client payment refunded" })
        .eq("payment_id", payment.id)
        .in("payout_status", ["NOT_ELIGIBLE", "PENDING"]);
      await recomputeBookingState(supabase, payment.booking_id);
      break;
    }
    case "payout_succeeded": {
      if (!event.providerPayoutId) break;
      await supabase
        .from("payouts")
        .update({ payout_status: "PAID", paid_at: new Date().toISOString() })
        .eq("provider", event.provider)
        .eq("provider_payout_id", event.providerPayoutId)
        .neq("payout_status", "PAID");
      break;
    }
    case "payout_failed":
    case "payout_reversed": {
      if (!event.providerPayoutId) break;
      await supabase
        .from("payouts")
        .update({
          payout_status: event.kind === "payout_failed" ? "FAILED" : "REVERSED",
          failure_reason: event.failureReason ?? event.eventType,
        })
        .eq("provider", event.provider)
        .eq("provider_payout_id", event.providerPayoutId);
      break;
    }
    case "account_updated": {
      if (!event.connectedAccountId || !event.accountStatus) break;
      const s = event.accountStatus;
      const status = s.payoutsEnabled
        ? "PAYOUTS_ENABLED"
        : s.detailsSubmitted && s.requirements.length === 0
        ? "VERIFIED"
        : s.detailsSubmitted
        ? "PENDING_VERIFICATION"
        : "ONBOARDING";
      await supabase
        .from("payout_accounts")
        .update({
          status,
          charges_enabled: s.chargesEnabled,
          payouts_enabled: s.payoutsEnabled,
          details_submitted: s.detailsSubmitted,
          requirements: s.requirements,
          country: s.country ?? null,
          payout_currency: s.payoutCurrency ?? null,
          last_synced_at: new Date().toISOString(),
        })
        .eq("connected_account_id", event.connectedAccountId);
      break;
    }
    default:
      break;
  }
}
