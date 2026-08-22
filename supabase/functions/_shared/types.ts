// Shared payment/payout domain types for JogBook.
// These mirror the database enums exactly.

export type PaymentMethod = "CARD" | "PAYPAL" | "USDC" | "USDT" | "BTC" | "SOL" | "ETH";
export type PaymentType = "DEPOSIT" | "BALANCE" | "FULL";
export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";
export type PayoutStatus =
  | "NOT_ELIGIBLE"
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REVERSED";
export type PayoutAccountStatus =
  | "NOT_CONNECTED"
  | "ONBOARDING"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "PAYOUTS_ENABLED"
  | "RESTRICTED";
export type PayoutTiming = "IMMEDIATE" | "ON_GIG_COMPLETE" | "MANUAL";
export type DepositType = "PERCENTAGE" | "FIXED" | "FULL";

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string, missing: string[]) {
    super(
      `Payment provider "${provider}" is not connected yet. Missing secret(s): ${missing.join(", ")}.`,
    );
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderRequestError extends Error {
  status: number;
  body: string;
  constructor(provider: string, status: number, body: string) {
    super(`[${provider}] provider request failed [${status}]: ${body}`);
    this.name = "ProviderRequestError";
    this.status = status;
    this.body = body;
  }
}

/** Everything a provider needs to open a checkout for one payment row. */
export interface CheckoutRequest {
  paymentId: string;
  bookingId: string;
  description: string;
  /** Amount the customer actually pays, in `currency`. */
  amount: number;
  currency: string;
  method: PaymentMethod;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  /** Connected account of the DJ, when the provider supports destination charges. */
  connectedAccountId?: string | null;
  /** Platform fee in `currency`, taken by JogBook on this charge. */
  applicationFeeAmount?: number;
  metadata: Record<string, string>;
}

export interface CheckoutResult {
  providerPaymentId: string;
  checkoutUrl?: string;
  /** Crypto-only fields. */
  cryptoAsset?: string;
  cryptoNetwork?: string;
  cryptoAmount?: number;
  cryptoAddress?: string;
  exchangeRate?: number;
  confirmationStatus?: string;
}

/** Normalised webhook event, whatever the provider. */
export interface NormalisedEvent {
  provider: string;
  eventId: string;
  eventType: string;
  kind:
    | "payment_succeeded"
    | "payment_failed"
    | "payment_processing"
    | "payment_refunded"
    | "payout_succeeded"
    | "payout_failed"
    | "payout_reversed"
    | "account_updated"
    | "unhandled";
  providerPaymentId?: string;
  providerPayoutId?: string;
  connectedAccountId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  transactionHash?: string;
  cryptoAsset?: string;
  cryptoNetwork?: string;
  cryptoAmount?: number;
  exchangeRate?: number;
  confirmationStatus?: string;
  failureReason?: string;
  accountStatus?: {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirements: unknown[];
    country?: string;
    payoutCurrency?: string;
  };
  raw: unknown;
}

export interface PaymentProvider {
  id: string;
  methods: PaymentMethod[];
  isConfigured(): boolean;
  missingSecrets(): string[];
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  /** Verifies the signature and normalises the event. Throws if invalid. */
  parseWebhook(rawBody: string, headers: Headers): Promise<NormalisedEvent>;
}

export interface PayoutProvider {
  id: string;
  isConfigured(): boolean;
  missingSecrets(): string[];
  createConnectedAccount(input: {
    email: string;
    country: string;
    djId: string;
  }): Promise<{ connectedAccountId: string }>;
  createOnboardingLink(input: {
    connectedAccountId: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
  getAccountStatus(connectedAccountId: string): Promise<{
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirements: unknown[];
    country?: string;
    payoutCurrency?: string;
  }>;
  createTransfer(input: {
    connectedAccountId: string;
    amount: number;
    currency: string;
    payoutId: string;
    metadata: Record<string, string>;
  }): Promise<{ providerPayoutId: string; status: PayoutStatus }>;
}
