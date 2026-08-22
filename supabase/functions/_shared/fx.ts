// Currency conversion for multi-currency checkout.
// The booking amount/currency stays immutable; we only quote what the
// customer pays. Rates come from a configurable rates endpoint.
import { round2 } from "./money.ts";

const RATES_URL = Deno.env.get("FX_RATES_API_URL") ?? "https://open.er-api.com/v6/latest";

const cache = new Map<string, { rates: Record<string, number>; fetchedAt: number }>();
const TTL_MS = 60 * 60 * 1000;

async function ratesFor(base: string): Promise<Record<string, number>> {
  const key = base.toUpperCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.rates;

  const apiKey = Deno.env.get("FX_RATES_API_KEY");
  const url = `${RATES_URL}/${key}${apiKey ? `?apikey=${apiKey}` : ""}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    console.error(`FX rates request failed [${res.status}]: ${text}`);
    throw new Error(`Unable to fetch exchange rates for ${key}`);
  }
  const body = JSON.parse(text) as { rates?: Record<string, number>; conversion_rates?: Record<string, number> };
  const rates = body.rates ?? body.conversion_rates;
  if (!rates) throw new Error("Exchange rate response had no rates");
  cache.set(key, { rates, fetchedAt: Date.now() });
  return rates;
}

/**
 * Converts a booking amount into the currency the customer pays in.
 * Returns rate 1 when the currencies match (no network call).
 */
export async function quote(
  bookingAmount: number,
  bookingCurrency: string,
  payCurrency: string,
): Promise<{ amount: number; rate: number }> {
  if (bookingCurrency.toUpperCase() === payCurrency.toUpperCase()) {
    return { amount: round2(bookingAmount), rate: 1 };
  }
  const rates = await ratesFor(bookingCurrency);
  const rate = rates[payCurrency.toUpperCase()];
  if (!rate) throw new Error(`No exchange rate available for ${bookingCurrency} -> ${payCurrency}`);
  return { amount: round2(bookingAmount * rate), rate };
}
