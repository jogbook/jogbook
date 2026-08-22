import type { DepositType } from "./types.ts";

/** Currencies that have no minor unit in Stripe/PayPal. */
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG",
  "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export function isZeroDecimal(currency: string): boolean {
  return ZERO_DECIMAL.has(currency.toUpperCase());
}

/** Major units -> provider minor units (cents). */
export function toMinorUnits(amount: number, currency: string): number {
  return isZeroDecimal(currency)
    ? Math.round(amount)
    : Math.round(amount * 100);
}

/** Provider minor units -> major units. */
export function fromMinorUnits(amount: number, currency: string): number {
  return isZeroDecimal(currency) ? amount : round2(amount / 100);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Splits a performance fee into deposit + balance.
 * The booking currency amount is canonical and never mutated afterwards.
 */
export function splitFee(
  performanceFee: number,
  depositType: DepositType,
  depositValue: number,
): { depositAmount: number; balanceAmount: number } {
  const fee = round2(performanceFee);
  let deposit: number;
  if (depositType === "FULL") {
    deposit = fee;
  } else if (depositType === "FIXED") {
    deposit = Math.min(round2(depositValue), fee);
  } else {
    deposit = round2((fee * depositValue) / 100);
  }
  deposit = Math.max(0, Math.min(deposit, fee));
  return { depositAmount: deposit, balanceAmount: round2(fee - deposit) };
}

/** JogBook commission on a gross amount. Never hard-coded — always from settings. */
export function commissionSplit(
  grossAmount: number,
  commissionPercent: number,
): { platformFee: number; netAmount: number } {
  const gross = round2(grossAmount);
  const platformFee = round2((gross * commissionPercent) / 100);
  return { platformFee, netAmount: round2(gross - platformFee) };
}
