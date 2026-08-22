// DJ payout account management + payout release.
// POST { action: "connect" | "sync" | "release", ... }
//
// JogBook never sees bank details: onboarding happens entirely on the
// provider's hosted pages. We store the connected-account id and status only.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { json, requireUser, serviceClient } from "../_shared/db.ts";
import { activePayoutProvider } from "../_shared/providers/index.ts";
import { releasePayout } from "../_shared/ledger.ts";
import { ProviderNotConfiguredError, ProviderRequestError } from "../_shared/types.ts";

const reply = (body: unknown, status = 200) =>
  json(body, status, corsHeaders as unknown as Record<string, string>);

const COUNTRY = /^[A-Z]{2}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const supabase = serviceClient();

  try {
    const user = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, stage_name, location")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return reply({ error: "Only DJs have payout accounts" }, 403);

    const provider = activePayoutProvider();
    const { data: existing } = await supabase
      .from("payout_accounts")
      .select("*")
      .eq("dj_id", profile.id)
      .eq("provider", provider.id)
      .maybeSingle();

    if (action === "connect") {
      const country = String(body.country ?? existing?.country ?? "").toUpperCase();
      if (!COUNTRY.test(country)) {
        return reply({ error: "A two-letter country code is required" }, 400);
      }
      if (!provider.isConfigured()) {
        // Record intent so the dashboard can show the correct state.
        await supabase.from("payout_accounts").upsert(
          {
            user_id: user.id,
            dj_id: profile.id,
            provider: provider.id,
            country,
            status: existing?.connected_account_id ? existing.status : "NOT_CONNECTED",
          },
          { onConflict: "dj_id,provider" },
        );
        return reply(
          {
            error: `Payouts are not connected yet on this JogBook environment.`,
            missing_secrets: provider.missingSecrets(),
            provider: provider.id,
          },
          503,
        );
      }

      let connectedAccountId = existing?.connected_account_id ?? null;
      if (!connectedAccountId) {
        const created = await provider.createConnectedAccount({
          email: user.email ?? "",
          country,
          djId: profile.id,
        });
        connectedAccountId = created.connectedAccountId;
      }

      await supabase.from("payout_accounts").upsert(
        {
          user_id: user.id,
          dj_id: profile.id,
          provider: provider.id,
          connected_account_id: connectedAccountId,
          country,
          status: "ONBOARDING",
        },
        { onConflict: "dj_id,provider" },
      );

      const origin = String(body.origin ?? new URL(req.url).origin);
      const link = await provider.createOnboardingLink({
        connectedAccountId,
        refreshUrl: `${origin}/payouts?onboarding=refresh`,
        returnUrl: `${origin}/payouts?onboarding=complete`,
      });
      return reply({ onboarding_url: link.url, status: "ONBOARDING" });
    }

    if (action === "sync") {
      if (!existing?.connected_account_id) return reply({ status: "NOT_CONNECTED" });
      if (!provider.isConfigured()) {
        return reply({ status: existing.status, missing_secrets: provider.missingSecrets() });
      }
      const s = await provider.getAccountStatus(existing.connected_account_id);
      const status = s.payoutsEnabled
        ? "PAYOUTS_ENABLED"
        : s.detailsSubmitted && s.requirements.length === 0
        ? "VERIFIED"
        : s.detailsSubmitted
        ? "PENDING_VERIFICATION"
        : "ONBOARDING";
      const { data: updated } = await supabase
        .from("payout_accounts")
        .update({
          status,
          charges_enabled: s.chargesEnabled,
          payouts_enabled: s.payoutsEnabled,
          details_submitted: s.detailsSubmitted,
          requirements: s.requirements,
          country: s.country ?? existing.country,
          payout_currency: s.payoutCurrency ?? existing.payout_currency,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .maybeSingle();
      return reply({ status, account: updated });
    }

    if (action === "release") {
      const payoutId = String(body.payout_id ?? "");
      const { data: payout } = await supabase
        .from("payouts")
        .select("id, dj_id, payout_status")
        .eq("id", payoutId)
        .maybeSingle();
      if (!payout || payout.dj_id !== profile.id) return reply({ error: "Payout not found" }, 404);
      if (payout.payout_status !== "PENDING") {
        return reply({ error: `Payout is ${payout.payout_status} and cannot be released` }, 400);
      }
      const released = await releasePayout(supabase, payout.id);
      return reply({ payout: released });
    }

    return reply({ error: "Unknown action" }, 400);
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof ProviderNotConfiguredError) return reply({ error: err.message }, 503);
    if (err instanceof ProviderRequestError) {
      return reply({ error: "Payout provider request failed", details: err.body }, err.status);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("payouts error:", message);
    return reply({ error: message }, 500);
  }
});
