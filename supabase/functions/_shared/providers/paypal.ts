// PayPal adapter: PayPal wallet checkout (Orders v2) + Payouts API.
import {
  type CheckoutRequest,
  type CheckoutResult,
  type NormalisedEvent,
  type PaymentProvider,
  type PayoutProvider,
  ProviderNotConfiguredError,
  ProviderRequestError,
} from "../types.ts";
import { round2 } from "../money.ts";

const LIVE = "https://api-m.paypal.com";
const SANDBOX = "https://api-m.sandbox.paypal.com";

function base() {
  return (Deno.env.get("PAYPAL_MODE") ?? "sandbox") === "live" ? LIVE : SANDBOX;
}
function clientId() {
  return Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
}
function clientSecret() {
  return Deno.env.get("PAYPAL_CLIENT_SECRET") ?? "";
}

function missing(): string[] {
  const out: string[] = [];
  if (!clientId()) out.push("PAYPAL_CLIENT_ID");
  if (!clientSecret()) out.push("PAYPAL_CLIENT_SECRET");
  return out;
}

async function accessToken(): Promise<string> {
  const m = missing();
  if (m.length) throw new ProviderNotConfiguredError("paypal", m);
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId()}:${clientSecret()}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`PayPal token request failed [${res.status}]: ${text}`);
    throw new ProviderRequestError("paypal", res.status, text);
  }
  return (JSON.parse(text) as { access_token: string }).access_token;
}

export async function paypalRequest<T>(
  path: string,
  method: "GET" | "POST",
  body?: unknown,
  requestId?: string,
): Promise<T> {
  const token = await accessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (requestId) headers["PayPal-Request-Id"] = requestId;
  const res = await fetch(`${base()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`PayPal ${method} ${path} failed [${res.status}]: ${text}`);
    throw new ProviderRequestError("paypal", res.status, text);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export const paypalPaymentProvider: PaymentProvider = {
  id: "paypal",
  methods: ["PAYPAL"],
  isConfigured: () => missing().length === 0,
  missingSecrets: missing,

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const order = await paypalRequest<{
      id: string;
      links: { rel: string; href: string }[];
    }>(
      "/v2/checkout/orders",
      "POST",
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: req.paymentId,
            custom_id: req.paymentId,
            description: req.description.slice(0, 127),
            amount: {
              currency_code: req.currency.toUpperCase(),
              value: round2(req.amount).toFixed(2),
            },
            // Marketplace split: JogBook's commission is retained as a
            // platform fee, the remainder is routed to the DJ's payee account.
            ...(req.connectedAccountId
              ? {
                  payee: { merchant_id: req.connectedAccountId },
                  payment_instruction: {
                    disbursement_mode: "INSTANT",
                    platform_fees: req.applicationFeeAmount
                      ? [
                          {
                            amount: {
                              currency_code: req.currency.toUpperCase(),
                              value: round2(req.applicationFeeAmount).toFixed(2),
                            },
                          },
                        ]
                      : undefined,
                  },
                }
              : {}),
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: req.successUrl,
              cancel_url: req.cancelUrl,
              user_action: "PAY_NOW",
            },
          },
        },
      },
      `order_${req.paymentId}`,
    );
    const approve = order.links.find((l) => l.rel === "payer-action" || l.rel === "approve");
    return { providerPaymentId: order.id, checkoutUrl: approve?.href };
  },

  async parseWebhook(rawBody: string, headers: Headers): Promise<NormalisedEvent> {
    const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID") ?? "";
    if (!webhookId) throw new ProviderNotConfiguredError("paypal", ["PAYPAL_WEBHOOK_ID"]);

    // PayPal verifies signatures server-side via its own API.
    const verification = await paypalRequest<{ verification_status: string }>(
      "/v1/notifications/verify-webhook-signature",
      "POST",
      {
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      },
    );
    if (verification.verification_status !== "SUCCESS") {
      throw new Error("PayPal webhook signature verification failed");
    }

    const event = JSON.parse(rawBody) as {
      id: string;
      event_type: string;
      resource: Record<string, any>;
    };
    const r = event.resource;
    const paymentId =
      r.custom_id ??
      r.purchase_units?.[0]?.custom_id ??
      r.supplementary_data?.related_ids?.order_id;
    const base = {
      provider: "paypal",
      eventId: event.id,
      eventType: event.event_type,
      raw: event,
    };

    switch (event.event_type) {
      case "CHECKOUT.ORDER.APPROVED":
        // Buyer approved; capture the funds. PayPal then sends
        // PAYMENT.CAPTURE.COMPLETED, which marks the payment paid.
        try {
          await paypalRequest(`/v2/checkout/orders/${r.id}/capture`, "POST", {}, `capture_${r.id}`);
        } catch (e) {
          if (!String(e).includes("ORDER_ALREADY_CAPTURED")) throw e;
        }
        return { ...base, kind: "payment_processing", providerPaymentId: r.id, paymentId };
      case "PAYMENT.CAPTURE.COMPLETED":
        return {
          ...base,
          kind: "payment_succeeded",
          providerPaymentId: r.supplementary_data?.related_ids?.order_id ?? r.id,
          paymentId,
          amount: Number(r.amount?.value ?? 0),
          currency: r.amount?.currency_code,
        };
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.DECLINED":
case "CHECKOUT.ORDER.VOIDED":
        return { ...base, kind: "payment_failed", providerPaymentId: r.id, paymentId };
      case "PAYMENT.CAPTURE.REFUNDED":
        return { ...base, kind: "payment_refunded", providerPaymentId: r.id, paymentId };
      case "PAYMENT.PAYOUTSBATCH.SUCCESS":
      case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED":
        return { ...base, kind: "payout_succeeded", providerPayoutId: r.payout_item_id ?? r.batch_header?.payout_batch_id };
      case "PAYMENT.PAYOUTS-ITEM.FAILED":
      case "PAYMENT.PAYOUTS-ITEM.DENIED":
        return { ...base, kind: "payout_failed", providerPayoutId: r.payout_item_id };
      default:
        return { ...base, kind: "unhandled" };
    }
  },
};

export const paypalPayoutProvider: PayoutProvider = {
  id: "paypal",
  isConfigured: () => missing().length === 0,
  missingSecrets: missing,

  // PayPal onboarding uses Partner Referrals; the DJ completes it on
  // PayPal-hosted pages and we only ever keep the merchant id.
  async createConnectedAccount({ email, country, djId }) {
    const referral = await paypalRequest<{ links: { rel: string; href: string }[] }>(
      "/v2/customer/partner-referrals",
      "POST",
      {
        tracking_id: djId,
        email,
        preferred_language_code: "en",
        legal_country_code: country,
        operations: [
          { operation: "API_INTEGRATION", api_integration_preference: { rest_api_integration: { integration_method: "PAYPAL", integration_type: "THIRD_PARTY", third_party_details: { features: ["PAYMENT", "REFUND", "PARTNER_FEE"] } } } },
        ],
        products: ["EXPRESS_CHECKOUT"],
      },
      `referral_${djId}`,
    );
    const actionUrl = referral.links.find((l) => l.rel === "action_url")?.href ?? "";
    return { connectedAccountId: `pending:${djId}:${actionUrl}` };
  },

  async createOnboardingLink({ connectedAccountId }) {
    // The action_url is embedded when the referral is created.
    const url = connectedAccountId.startsWith("pending:")
      ? connectedAccountId.split(":").slice(2).join(":")
      : "";
    if (!url) throw new Error("No PayPal onboarding URL available for this account");
    return { url };
  },

  async getAccountStatus(connectedAccountId) {
    const status = await paypalRequest<Record<string, any>>(
      `/v1/customer/partners/${Deno.env.get("PAYPAL_PARTNER_ID") ?? "me"}/merchant-integrations/${connectedAccountId}`,
      "GET",
    );
    return {
      chargesEnabled: !!status.payments_receivable,
      payoutsEnabled: !!status.payments_receivable && !!status.primary_email_confirmed,
      detailsSubmitted: !!status.primary_email_confirmed,
      requirements: status.oauth_third_party ?? [],
      country: status.country,
    };
  },

  async createTransfer({ connectedAccountId, amount, currency, payoutId, metadata }) {
    const batch = await paypalRequest<{ batch_header: { payout_batch_id: string } }>(
      "/v1/payments/payouts",
      "POST",
      {
        sender_batch_header: {
          sender_batch_id: payoutId,
          email_subject: "You have a JogBook payout",
        },
        items: [
          {
            recipient_type: "PAYPAL_ID",
            receiver: connectedAccountId,
            amount: { value: round2(amount).toFixed(2), currency },
            note: metadata.description ?? "JogBook DJ earnings",
            sender_item_id: payoutId,
          },
        ],
      },
      `payout_${payoutId}`,
    );
    return { providerPayoutId: batch.batch_header.payout_batch_id, status: "PROCESSING" };
  },
};
