// Stripe adapter: cards (multi-currency) + Connect payouts.
// Real API calls, gated behind secret presence so the app runs before keys exist.
import {
  type CheckoutRequest,
  type CheckoutResult,
  type NormalisedEvent,
  type PaymentProvider,
  type PayoutProvider,
  ProviderNotConfiguredError,
  ProviderRequestError,
} from "../types.ts";
import { fromMinorUnits, toMinorUnits } from "../money.ts";

const API = "https://api.stripe.com/v1";

function secret() {
  return Deno.env.get("STRIPE_SECRET_KEY") ?? "";
}
function webhookSecret() {
  return Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
}

function missing(): string[] {
  const out: string[] = [];
  if (!secret()) out.push("STRIPE_SECRET_KEY");
  return out;
}

function requireConfigured() {
  const m = missing();
  if (m.length) throw new ProviderNotConfiguredError("stripe", m);
}

function form(data: Record<string, unknown>, prefix = ""): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const k = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object") parts.push(...form(item as Record<string, unknown>, `${k}[${i}]`));
        else parts.push(`${encodeURIComponent(`${k}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof value === "object") {
      parts.push(...form(value as Record<string, unknown>, k));
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

async function stripeRequest<T>(
  path: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  requireConfigured();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret()}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? form(body).join("&") : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Stripe ${method} ${path} failed [${res.status}]: ${text}`);
    throw new ProviderRequestError("stripe", res.status, text);
  }
  return JSON.parse(text) as T;
}

/** Constant-time-ish HMAC verification of the Stripe-Signature header. */
async function verifySignature(rawBody: string, header: string | null): Promise<void> {
  const wh = webhookSecret();
  if (!wh) throw new ProviderNotConfiguredError("stripe", ["STRIPE_WEBHOOK_SECRET"]);
  if (!header) throw new Error("Missing Stripe-Signature header");

  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=") as [string, string]),
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) throw new Error("Malformed Stripe-Signature header");

  // Reject events older than 5 minutes (replay protection).
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    throw new Error("Stripe webhook timestamp outside tolerance");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(wh),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expected !== signature) throw new Error("Stripe webhook signature mismatch");
}

export const stripePaymentProvider: PaymentProvider = {
  id: "stripe",
  methods: ["CARD"],
  isConfigured: () => missing().length === 0,
  missingSecrets: missing,

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const body: Record<string, unknown> = {
      mode: "payment",
      "payment_method_types[0]": "card",
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      customer_email: req.customerEmail || undefined,
      client_reference_id: req.paymentId,
      metadata: { ...req.metadata, payment_id: req.paymentId, booking_id: req.bookingId },
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": req.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": toMinorUnits(req.amount, req.currency),
      "line_items[0][price_data][product_data][name]": req.description,
      "payment_intent_data[metadata][payment_id]": req.paymentId,
      "payment_intent_data[metadata][booking_id]": req.bookingId,
    };

    // Marketplace destination charge: funds land on the DJ's connected
    // account, JogBook keeps only the application fee. No manual transfers.
    if (req.connectedAccountId) {
      body["payment_intent_data[transfer_data][destination]"] = req.connectedAccountId;
      if (req.applicationFeeAmount && req.applicationFeeAmount > 0) {
        body["payment_intent_data[application_fee_amount]"] = toMinorUnits(
          req.applicationFeeAmount,
          req.currency,
        );
      }
    }

    const session = await stripeRequest<{ id: string; url: string }>(
      "/checkout/sessions",
      "POST",
      body,
      `checkout_${req.paymentId}`,
    );
    return { providerPaymentId: session.id, checkoutUrl: session.url };
  },

  async parseWebhook(rawBody: string, headers: Headers): Promise<NormalisedEvent> {
    await verifySignature(rawBody, headers.get("stripe-signature"));
    const event = JSON.parse(rawBody) as {
      id: string;
      type: string;
      account?: string;
      data: { object: Record<string, any> };
    };
    const obj = event.data.object;
    const base = {
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
      connectedAccountId: event.account,
      raw: event,
    };

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return {
          ...base,
          kind: "payment_succeeded",
          providerPaymentId: obj.id,
          paymentId: obj.metadata?.payment_id ?? obj.client_reference_id,
          amount: fromMinorUnits(obj.amount_total ?? 0, obj.currency ?? "usd"),
          currency: (obj.currency ?? "usd").toUpperCase(),
        };
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
      case "payment_intent.payment_failed":
        return {
          ...base,
          kind: "payment_failed",
          providerPaymentId: obj.id,
          paymentId: obj.metadata?.payment_id ?? obj.client_reference_id,
          failureReason: obj.last_payment_error?.message ?? event.type,
        };
      case "charge.refunded":
        return {
          ...base,
          kind: "payment_refunded",
          providerPaymentId: obj.payment_intent ?? obj.id,
          paymentId: obj.metadata?.payment_id,
        };
      case "transfer.paid":
      case "payout.paid":
        return { ...base, kind: "payout_succeeded", providerPayoutId: obj.id };
      case "transfer.failed":
      case "payout.failed":
        return {
          ...base,
          kind: "payout_failed",
          providerPayoutId: obj.id,
          failureReason: obj.failure_message ?? event.type,
        };
      case "transfer.reversed":
      case "payout.reconciliation_completed":
        return { ...base, kind: "payout_reversed", providerPayoutId: obj.id };
      case "account.updated":
        return {
          ...base,
          kind: "account_updated",
          connectedAccountId: obj.id,
          accountStatus: {
            chargesEnabled: !!obj.charges_enabled,
            payoutsEnabled: !!obj.payouts_enabled,
            detailsSubmitted: !!obj.details_submitted,
            requirements: obj.requirements?.currently_due ?? [],
            country: obj.country,
            payoutCurrency: obj.default_currency?.toUpperCase(),
          },
        };
      default:
        return { ...base, kind: "unhandled" };
    }
  },
};

export const stripePayoutProvider: PayoutProvider = {
  id: "stripe",
  isConfigured: () => missing().length === 0,
  missingSecrets: missing,

  async createConnectedAccount({ email, country, djId }) {
    const account = await stripeRequest<{ id: string }>("/accounts", "POST", {
      type: "express",
      country,
      email,
      "capabilities[transfers][requested]": "true",
      "capabilities[card_payments][requested]": "true",
      "business_type": "individual",
      metadata: { dj_id: djId, platform: "jogbook" },
    }, `account_${djId}`);
    return { connectedAccountId: account.id };
  },

  async createOnboardingLink({ connectedAccountId, refreshUrl, returnUrl }) {
    const link = await stripeRequest<{ url: string }>("/account_links", "POST", {
      account: connectedAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
      collect: "eventually_due",
    });
    return { url: link.url };
  },

  async getAccountStatus(connectedAccountId) {
    const acct = await stripeRequest<Record<string, any>>(
      `/accounts/${connectedAccountId}`,
      "GET",
    );
    return {
      chargesEnabled: !!acct.charges_enabled,
      payoutsEnabled: !!acct.payouts_enabled,
      detailsSubmitted: !!acct.details_submitted,
      requirements: acct.requirements?.currently_due ?? [],
      country: acct.country,
      payoutCurrency: acct.default_currency?.toUpperCase(),
    };
  },

  async createTransfer({ connectedAccountId, amount, currency, payoutId, metadata }) {
    const transfer = await stripeRequest<{ id: string }>("/transfers", "POST", {
      amount: toMinorUnits(amount, currency),
      currency: currency.toLowerCase(),
      destination: connectedAccountId,
      metadata: { ...metadata, payout_id: payoutId },
    }, `payout_${payoutId}`);
    return { providerPayoutId: transfer.id, status: "PROCESSING" };
  },
};
