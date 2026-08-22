// Provider registry. Adding a provider means adding an adapter here —
// no changes to the booking, payment or payout logic.
import type { PaymentMethod, PaymentProvider, PayoutProvider } from "../types.ts";
import { stripePaymentProvider, stripePayoutProvider } from "./stripe.ts";
import { paypalPaymentProvider, paypalPayoutProvider } from "./paypal.ts";
import { cryptoPaymentProvider } from "./crypto.ts";

export const paymentProviders: PaymentProvider[] = [
  stripePaymentProvider,
  paypalPaymentProvider,
  cryptoPaymentProvider,
];

export const payoutProviders: Record<string, PayoutProvider> = {
  stripe: stripePayoutProvider,
  paypal: paypalPayoutProvider,
};

export function providerForMethod(method: PaymentMethod): PaymentProvider {
  const provider = paymentProviders.find((p) => p.methods.includes(method));
  if (!provider) throw new Error(`No payment provider handles method ${method}`);
  return provider;
}

export function providerById(id: string): PaymentProvider | undefined {
  return paymentProviders.find((p) => p.id === id);
}

/** The marketplace/connected-account provider used for DJ payouts. */
export function activePayoutProvider(): PayoutProvider {
  const id = Deno.env.get("PAYOUT_PROVIDER") ?? "stripe";
  return payoutProviders[id] ?? stripePayoutProvider;
}

/** Which methods are technically available right now (secrets present). */
export function availableMethods(): Record<PaymentMethod, boolean> {
  const out = {} as Record<PaymentMethod, boolean>;
  for (const provider of paymentProviders) {
    for (const method of provider.methods) out[method] = provider.isConfigured();
  }
  return out;
}
