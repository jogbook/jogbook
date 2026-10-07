import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export type PaymentMethod = "CARD" | "PAYPAL" | "USDC" | "USDT" | "BTC" | "SOL" | "ETH";
export type PaymentType = "DEPOSIT" | "BALANCE" | "FULL";
export type PaymentStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
export type PayoutStatus = "NOT_ELIGIBLE" | "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REVERSED";
export type PayoutAccountStatus =
  | "NOT_CONNECTED"
  | "ONBOARDING"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "PAYOUTS_ENABLED"
  | "RESTRICTED";
export type DepositType = "PERCENTAGE" | "FIXED" | "FULL";
export type PayoutMethod = "CARD" | "USDT" | "USDC" | "SOL" | "ETH";
export type CryptoPayoutMethod = Exclude<PayoutMethod, "CARD">;

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  CARD: "Card / bank transfer",
  USDT: "USDT (stablecoin)",
  USDC: "USDC (stablecoin)",
  SOL: "Solana (SOL)",
  ETH: "Ethereum (ETH)",
};

/** Networks each crypto payout asset can be sent on. */
export const PAYOUT_NETWORKS: Record<CryptoPayoutMethod, string[]> = {
  USDT: ["ethereum", "tron", "solana", "polygon"],
  USDC: ["ethereum", "solana", "polygon", "base"],
  SOL: ["solana"],
  ETH: ["ethereum", "base", "arbitrum"],
};

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TRON_ADDRESS = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

/** Client-side sanity check; the edge function validates again server-side. */
export function validateWalletAddress(network: string, address: string): string | null {
  const value = address.trim();
  if (!value) return "A wallet address is required";
  if (network === "solana") return SOLANA_ADDRESS.test(value) ? null : "That doesn't look like a Solana address";
  if (network === "tron") return TRON_ADDRESS.test(value) ? null : "That doesn't look like a Tron (TRC-20) address";
  return EVM_ADDRESS.test(value) ? null : "That doesn't look like a valid 0x… address";
}

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: "Card",
  PAYPAL: "PayPal",
  USDC: "USDC",
  USDT: "USDT",
  BTC: "Bitcoin",
  SOL: "Solana",
  ETH: "Ethereum",
};

/** Payment methods that settle on-chain. */
export const CRYPTO_PAYMENT_METHODS: PaymentMethod[] = ["USDC", "USDT", "BTC", "SOL", "ETH"];

export function isCryptoMethod(method: PaymentMethod) {
  return CRYPTO_PAYMENT_METHODS.includes(method);
}

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING: "bg-muted text-muted-foreground border-border",
  PROCESSING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  PAID: "bg-primary/15 text-primary border-primary/25",
  FAILED: "bg-destructive/15 text-destructive border-destructive/25",
  REFUNDED: "bg-muted text-muted-foreground border-border",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export const PAYOUT_STATUS_STYLES: Record<PayoutStatus, string> = {
  NOT_ELIGIBLE: "bg-muted text-muted-foreground border-border",
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  PROCESSING: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  PAID: "bg-primary/15 text-primary border-primary/25",
  FAILED: "bg-destructive/15 text-destructive border-destructive/25",
  REVERSED: "bg-destructive/10 text-destructive border-destructive/20",
};

export const PAYOUT_ACCOUNT_COPY: Record<
  PayoutAccountStatus,
  { label: string; tone: "ok" | "warn" | "pending"; detail: string }
> = {
  NOT_CONNECTED: {
    label: "Setup required",
    tone: "warn",
    detail: "Connect your payout account so JogBook can send your earnings to your bank account.",
  },
  ONBOARDING: {
    label: "Onboarding in progress",
    tone: "pending",
    detail: "Finish the secure onboarding steps with our payment provider to receive payouts.",
  },
  PENDING_VERIFICATION: {
    label: "Pending verification",
    tone: "pending",
    detail: "Your details are being verified by the payment provider. No action needed right now.",
  },
  VERIFIED: {
    label: "Verified",
    tone: "pending",
    detail: "Verified. Payouts switch on as soon as the provider enables transfers.",
  },
  PAYOUTS_ENABLED: {
    label: "Connected",
    tone: "ok",
    detail: "Your payout account is live. Eligible earnings are sent to your bank automatically.",
  },
  RESTRICTED: {
    label: "Restricted",
    tone: "warn",
    detail: "The payment provider needs more information before payouts can continue.",
  },
};

export function formatMoney(amount: number | string | null | undefined, currency = "USD") {
  const value = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatCrypto(amount: number | string | null | undefined, asset?: string | null) {
  const value = Number(amount ?? 0);
  return `${value.toFixed(value < 1 ? 8 : 4).replace(/0+$/, "").replace(/\.$/, "")} ${asset ?? ""}`.trim();
}

/** Surfaces the real edge-function error instead of "non-2xx status code". */
async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      const text = await error.context.text();
      try {
        const parsed = JSON.parse(text);
        message = parsed.error ?? parsed.details ?? text;
        if (parsed.missing_secrets?.length) {
          message = `${message} (missing: ${parsed.missing_secrets.join(", ")})`;
        }
      } catch {
        message = text || message;
      }
    }
    throw new Error(message);
  }
  return data as T;
}

// ---------- DJ booking money lifecycle ----------
export function setBookingTerms(input: {
  booking_id: string;
  performance_fee: number;
  booking_currency: string;
  deposit_type: DepositType;
  deposit_value: number;
  payment_deadline?: string;
  terms?: string;
}) {
  return invoke<{ booking: any }>("bookings", { action: "set_terms", ...input });
}

export function requestBalance(bookingId: string) {
  return invoke<{ booking: any; outstanding: number }>("bookings", {
    action: "request_balance",
    booking_id: bookingId,
  });
}

export function markGigCompleted(bookingId: string) {
  return invoke<{ booking: any }>("bookings", { action: "mark_completed", booking_id: bookingId });
}

// ---------- Payouts ----------
export function connectPayoutAccount(country: string) {
  return invoke<{ onboarding_url: string; status: PayoutAccountStatus }>("payouts", {
    action: "connect",
    country,
    origin: window.location.origin,
  });
}

export function syncPayoutAccount() {
  return invoke<{ status: PayoutAccountStatus; account: any }>("payouts", { action: "sync" });
}

export function releasePayout(payoutId: string) {
  return invoke<{ payout: any }>("payouts", { action: "release", payout_id: payoutId });
}

export function saveCryptoPayoutMethod(input: {
  method: CryptoPayoutMethod;
  network: string;
  wallet_address: string;
}) {
  return invoke<{ status: PayoutAccountStatus; account: any }>("payouts", {
    action: "set_crypto_method",
    ...input,
  });
}

export function switchToCardPayouts() {
  return invoke<{ status: PayoutAccountStatus; account: any }>("payouts", { action: "set_card_method" });
}

export async function getPayoutAccount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("payout_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
}

/** Launch switches: payments/payouts stay off until providers are activated. */
export async function getPaymentAvailability() {
  const data = await getPlatformSettings();
  return {
    paymentsEnabled: !!data?.payments_enabled,
    payoutsEnabled: !!data?.payouts_enabled,
    cryptoPayoutsEnabled: !!data?.crypto_payouts_enabled,
    enabledProviders: (data?.enabled_providers ?? []) as string[],
  };
}

export async function getPlatformSettings() {
  const { data } = await supabase.rpc("get_platform_settings").maybeSingle();
  return data;
}

export async function getPayments(djId: string) {
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("dj_id", djId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getPayouts(djId: string) {
  const { data } = await supabase
    .from("payouts")
    .select("*")
    .eq("dj_id", djId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export interface EarningsTotals {
  currency: string;
  gross: number;
  platformFees: number;
  net: number;
  pending: number;
  available: number;
  paidOut: number;
}

/** Derives earnings from payout rows — payment and payout states stay separate. */
export function summarisePayouts(payouts: any[], fallbackCurrency = "USD"): EarningsTotals {
  const currency = payouts[0]?.currency ?? fallbackCurrency;
  const sum = (rows: any[], key: string) =>
    Math.round(rows.reduce((total, row) => total + Number(row[key] ?? 0), 0) * 100) / 100;

  return {
    currency,
    gross: sum(payouts, "gross_amount"),
    platformFees: sum(payouts, "platform_fee"),
    net: sum(payouts, "net_amount"),
    pending: sum(
      payouts.filter((p) => ["NOT_ELIGIBLE", "PENDING"].includes(p.payout_status)),
      "net_amount",
    ),
    available: sum(
      payouts.filter((p) => ["PENDING", "PROCESSING"].includes(p.payout_status)),
      "net_amount",
    ),
    paidOut: sum(payouts.filter((p) => p.payout_status === "PAID"), "net_amount"),
  };
}

// ---------- Public client checkout ----------
export interface CheckoutSummary {
  booking: any;
  dj: any;
  payments: any[];
  settings: {
    payments_enabled?: boolean;
    supported_currencies: string[];
    methods: { method: PaymentMethod; available: boolean }[];
  };
}

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export async function getCheckoutSummary(token: string): Promise<CheckoutSummary> {
  const res = await fetch(`${FUNCTIONS_BASE}/checkout?token=${encodeURIComponent(token)}`, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Unable to load this booking");
  return body as CheckoutSummary;
}

export async function createCheckout(input: {
  token: string;
  payment_type: PaymentType;
  method: PaymentMethod;
  currency: string;
}) {
  const res = await fetch(`${FUNCTIONS_BASE}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    },
    body: JSON.stringify({ ...input, origin: window.location.origin }),
  });
  const body = await res.json();
  if (!res.ok) {
    const missing = body.missing_secrets?.length ? ` (missing: ${body.missing_secrets.join(", ")})` : "";
    throw new Error(`${body.error ?? "Checkout could not be started"}${missing}`);
  }
  return body as {
    payment_id: string;
    checkout_url: string | null;
    crypto: { asset: string; network: string; amount: number; address: string } | null;
  };
}

export function bookingPayUrl(token: string) {
  return `${window.location.origin}/pay/${token}`;
}
