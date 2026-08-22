// Verified, idempotent webhook intake for every payment provider.
// POST /payments-webhook?provider=stripe|paypal|crypto
//
// A duplicated delivery can never create a duplicate payment or payout:
// every event is written to webhook_events (unique on provider+event_id)
// before it is applied.
import { json, serviceClient } from "../_shared/db.ts";
import { providerById } from "../_shared/providers/index.ts";
import { applyEvent } from "../_shared/ledger.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const providerId =
    url.searchParams.get("provider") ??
    url.pathname.split("/").filter(Boolean).pop() ??
    "";
  const provider = providerById(providerId);
  if (!provider) return json({ error: `Unknown provider "${providerId}"` }, 400);

  const rawBody = await req.text();
  const supabase = serviceClient();

  let event;
  try {
    event = await provider.parseWebhook(rawBody, req.headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${providerId}] webhook rejected: ${message}`);
    // 400 so the provider retries only for genuine transport problems.
    return json({ error: "Webhook verification failed" }, 400);
  }

  // Idempotency gate.
  const { error: claimError } = await supabase.from("webhook_events").insert({
    provider: event.provider,
    event_id: event.eventId,
    event_type: event.eventType,
    payload: event.raw as Record<string, unknown>,
    processing_status: "processing",
  });

  if (claimError) {
    if (claimError.code === "23505") {
      // Already seen. Only retry when a previous attempt failed mid-flight.
      const { data: prior } = await supabase
        .from("webhook_events")
        .select("processing_status")
        .eq("provider", event.provider)
        .eq("event_id", event.eventId)
        .maybeSingle();
      if (prior?.processing_status !== "failed") {
        console.log(`[${event.provider}] duplicate event ${event.eventId} ignored`);
        return json({ received: true, duplicate: true });
      }
    } else {
      console.error(`Failed to record webhook event: ${claimError.message}`);
      return json({ error: "Could not record event" }, 500);
    }
  }

  try {
    await applyEvent(supabase, event);
    await supabase
      .from("webhook_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString() })
      .eq("provider", event.provider)
      .eq("event_id", event.eventId);
    return json({ received: true, kind: event.kind });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${event.provider}] failed to apply ${event.eventType}: ${message}`);
    await supabase
      .from("webhook_events")
      .update({ processing_status: "failed", error_message: message })
      .eq("provider", event.provider)
      .eq("event_id", event.eventId);
    // 500 lets the provider retry; the row is updated, not duplicated.
    return json({ error: "Event processing failed" }, 500);
  }
});
