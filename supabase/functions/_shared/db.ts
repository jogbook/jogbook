import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { DepositType, PayoutTiming } from "./types.ts";

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** Resolves the caller's auth user from the request's Authorization header. */
export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  return data.user;
}

export interface PlatformSettings {
  commission_percent: number;
  default_deposit_percent: number;
  default_deposit_type: DepositType;
  payout_timing: PayoutTiming;
  supported_payment_methods: string[];
  supported_currencies: string[];
  default_currency: string;
  balance_due_days: number;
  payments_enabled: boolean;
  payouts_enabled: boolean;
  crypto_payouts_enabled: boolean;
  enabled_providers: string[];
}

export async function getSettings(supabase: SupabaseClient): Promise<PlatformSettings> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(`Failed to load platform settings: ${error.message}`);
  if (!data) throw new Error("Platform settings row is missing");
  return {
    ...data,
    commission_percent: Number(data.commission_percent),
    default_deposit_percent: Number(data.default_deposit_percent),
  } as PlatformSettings;
}

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

/** Launch switch: a provider is usable only if payments are on AND it is listed. */
export function isProviderEnabled(settings: PlatformSettings, providerId: string): boolean {
  return !!settings.payments_enabled &&
    (settings.enabled_providers ?? []).map((p) => p.toUpperCase()).includes(providerId.toUpperCase());
}
