// Crypto adapter (USDC / USDT / BTC).
// We never build blockchain handling ourselves: a hosted crypto payment
// provider generates the charge, address and amount, and confirms via webhook.
// Default implementation targets the Coinbase Commerce API shape, which
// NOWPayments/BitPay style providers can be swapped in behind the same interface.
import {
  type CheckoutRequest,
  type CheckoutResult,
  type NormalisedEvent,
  type PaymentMethod,
  type PaymentProvider,
  ProviderNotConfiguredError,
  ProviderRequestError,
} from "../types.ts";
import { round2 } from "../money.ts";

const API = Deno.env.get("CRYPTO_PROVIDER_API_URL") ?? "https://api.commerce.coinbase.com";

/** Default settlement network per asset. */
const NETWORKS: Record<string, string> = {
  USDC: Deno.env.get("CRYPTO_NETWORK_USDC") ?? "ethereum",
  USDT: Deno.env.get("CRYPTO_NETWORK_USDT") ?? "ethereum",
  BTC: "bitcoin",
};

function apiKey() {
  return Deno.env.get("CRYPTO_PROVIDER_API_KEY") ?? "";
}
function webhookSecret() {
  return Deno.env.get("CRYPTO_PROVIDER_WEBHOOK_SECRET") ?? "";
}

function missing(): string[] {
  const out: string[] = [];
  if (!apiKey()) out.push("CRYPTO_PROVIDER_API_KEY");
  return out;
}

async function cryptoRequest<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const m = missing();
  if (m.length) throw new ProviderNotConfiguredError("crypto", m);
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "X-CC-Api-Key": apiKey(),
      "X-CC-Version": "2018-03-22",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Crypto provider ${method} ${path} failed [${res.status}]: ${text}`);
    throw new ProviderRequestError("crypto", res.status, text);
  }
  return JSON.parse(text) as T;
}

const ASSET_KEYS: Record<string, string[]> = {
  BTC: ["bitcoin", "BTC"],
  USDC: ["usdc", "USDC"],
  USDT: ["usdt", "tether", "USDT"],
};

function pickAddress(charge: Record<string, any>, asset: string): { address?: string; amount?: number } {
  const keys = ASSET_KEYS[asset] ?? [asset.toLowerCase()];
  for (const key of keys) {
    const address = charge.addresses?.[key];
    const amount = charge.pricing?.[key]?.amount ?? charge.pricing?.[key.toLowerCase()]?.amount;
    if (address || amount) {
      return { address, amount: amount !== undefined ? Number(amount) : undefined };
    }
  }
  return {};
}

async function verifySignature(rawBody: string, headers: Headers): Promise<void> {
  const wh = webhookSecret();
  if (!wh) throw new ProviderNotConfiguredError("crypto", ["CRYPTO_PROVIDER_WEBHOOK_SECRET"]);
  const signature = headers.get("x-cc-webhook-signature") ?? headers.get("x-webhook-signature");
  if (!signature) throw new Error("Missing crypto webhook signature header");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(wh),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expected !== signature.toLowerCase()) {
    throw new Error("Crypto webhook signature mismatch");
  }
}

export const cryptoPaymentProvider: PaymentProvider = {
  id: "crypto",
  methods: ["USDC", "USDT", "BTC"] as PaymentMethod[],
  isConfigured: () => missing().length === 0,
  missingSecrets: missing,

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const asset = req.method; // USDC | USDT | BTC
    const settlementCurrency = (Deno.env.get("CRYPTO_QUOTE_CURRENCY") ?? "USD").toUpperCase();

    const { data: charge } = await cryptoRequest<{ data: Record<string, any> }>(
      "/charges",
      "POST",
      {
        name: "JogBook booking",
        description: req.description.slice(0, 200),
        pricing_type: "fixed_price",
        local_price: {
          amount: round2(req.amount).toFixed(2),
          currency: settlementCurrency,
        },
        metadata: {
          ...req.metadata,
          payment_id: req.paymentId,
          booking_id: req.bookingId,
          asset,
        },
        redirect_url: req.successUrl,
        cancel_url: req.cancelUrl,
      },
    );

    const { address, amount } = pickAddress(charge, asset);
    const exchangeRate = amount && amount > 0 ? round2(req.amount) / amount : undefined;

    return {
      providerPaymentId: charge.id,
      checkoutUrl: charge.hosted_url,
      cryptoAsset: asset,
      cryptoNetwork: NETWORKS[asset],
      cryptoAmount: amount,
      cryptoAddress: address,
      exchangeRate,
      confirmationStatus: "AWAITING_PAYMENT",
    };
  },

  async parseWebhook(rawBody: string, headers: Headers): Promise<NormalisedEvent> {
    await verifySignature(rawBody, headers);
    const body = JSON.parse(rawBody) as {
      id?: string;
      event: { id: string; type: string; data: Record<string, any> };
    };
    const event = body.event;
    const charge = event.data;
    const asset = charge.metadata?.asset ?? "";
    const payment = charge.payments?.[charge.payments.length - 1] ?? {};
    const base = {
      provider: "crypto",
      eventId: event.id ?? body.id ?? charge.id,
      eventType: event.type,
      providerPaymentId: charge.id,
      paymentId: charge.metadata?.payment_id,
      cryptoAsset: asset || payment.value?.crypto?.currency,
      cryptoNetwork: payment.network ?? NETWORKS[asset],
      cryptoAmount: payment.value?.crypto?.amount ? Number(payment.value.crypto.amount) : undefined,
      amount: payment.value?.local?.amount ? Number(payment.value.local.amount) : undefined,
      currency: payment.value?.local?.currency,
      transactionHash: payment.transaction_id,
      raw: event,
    };

    switch (event.type) {
      case "charge:pending":
        return { ...base, kind: "payment_processing", confirmationStatus: "PENDING_CONFIRMATIONS" };
      case "charge:confirmed":
        return { ...base, kind: "payment_succeeded", confirmationStatus: "CONFIRMED" };
      case "charge:failed":
        return { ...base, kind: "payment_failed", confirmationStatus: "FAILED", failureReason: event.type };
      case "charge:resolved":
        return { ...base, kind: "payment_succeeded", confirmationStatus: "RESOLVED" };
      default:
        return { ...base, kind: "unhandled" };
    }
  },
};
