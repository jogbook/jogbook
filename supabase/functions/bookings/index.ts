// DJ-side booking money lifecycle.
// POST { action, booking_id, ... } — caller must own the DJ profile.
//   set_terms       -> performance fee, currency, deposit rule, deadline, terms
//   request_balance  -> notify client that the remaining balance is due
//   mark_completed   -> GIG_COMPLETED, applies payout eligibility
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getSettings, json, requireUser, serviceClient } from "../_shared/db.ts";
import { round2, splitFee } from "../_shared/money.ts";
import { markBookingPayoutsEligible, recomputeBookingState } from "../_shared/ledger.ts";
import type { DepositType } from "../_shared/types.ts";

const reply = (body: unknown, status = 200) =>
  json(body, status, corsHeaders as unknown as Record<string, string>);

const DEPOSIT_TYPES: DepositType[] = ["PERCENTAGE", "FIXED", "FULL"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const supabase = serviceClient();

  try {
    const user = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const bookingId = String(body.booking_id ?? "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return reply({ error: "Only DJs can manage booking payments" }, 403);

    const { data: booking } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking || booking.dj_id !== profile.id) return reply({ error: "Booking not found" }, 404);

    const settings = await getSettings(supabase);

    if (action === "set_terms") {
      const fee = Number(body.performance_fee);
      if (!Number.isFinite(fee) || fee <= 0) {
        return reply({ error: "Performance fee must be greater than zero" }, 400);
      }
      if (Number(booking.amount_paid ?? 0) > 0) {
        return reply({ error: "Terms cannot change after a payment has been made" }, 400);
      }
      const currency = String(body.booking_currency ?? settings.default_currency).toUpperCase();
      if (!settings.supported_currencies.includes(currency)) {
        return reply({ error: `${currency} is not a supported booking currency` }, 400);
      }
      const depositType = String(body.deposit_type ?? settings.default_deposit_type) as DepositType;
      if (!DEPOSIT_TYPES.includes(depositType)) return reply({ error: "Invalid deposit type" }, 400);

      const rawValue = Number(
        body.deposit_value ?? (depositType === "PERCENTAGE" ? settings.default_deposit_percent : 0),
      );
      if (!Number.isFinite(rawValue) || rawValue < 0) return reply({ error: "Invalid deposit value" }, 400);
      if (depositType === "PERCENTAGE" && rawValue > 100) {
        return reply({ error: "Deposit percentage cannot exceed 100" }, 400);
      }

      const { depositAmount, balanceAmount } = splitFee(fee, depositType, rawValue);
      const deadline =
        body.payment_deadline
          ? new Date(String(body.payment_deadline)).toISOString()
          : new Date(Date.now() + settings.balance_due_days * 86400000).toISOString();

      const { data: updated, error } = await supabase
        .from("booking_requests")
        .update({
          performance_fee: round2(fee),
          booking_currency: currency,
          deposit_type: depositType,
          deposit_value: rawValue,
          deposit_amount: depositAmount,
          balance_amount: balanceAmount,
          payment_deadline: deadline,
          terms: String(body.terms ?? booking.terms ?? ""),
          status: "accepted",
        })
        .eq("id", bookingId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return reply({ booking: updated });
    }

    if (action === "request_balance") {
      const outstanding = round2(Number(booking.performance_fee ?? 0) - Number(booking.amount_paid ?? 0));
      if (outstanding <= 0) return reply({ error: "Nothing is outstanding on this booking" }, 400);
      const { data: updated, error } = await supabase
        .from("booking_requests")
        .update({
          balance_requested_at: new Date().toISOString(),
          payment_state: "BALANCE_DUE",
          payment_deadline:
            booking.payment_deadline ??
            new Date(Date.now() + settings.balance_due_days * 86400000).toISOString(),
        })
        .eq("id", bookingId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return reply({ booking: updated, outstanding });
    }

    if (action === "mark_completed") {
      const { error } = await supabase
        .from("booking_requests")
        .update({ gig_state: "GIG_COMPLETED", completed_at: new Date().toISOString() })
        .eq("id", bookingId);
      if (error) throw new Error(error.message);

      if (settings.payout_timing === "ON_GIG_COMPLETE") {
        await markBookingPayoutsEligible(supabase, bookingId);
      }
      const updated = await recomputeBookingState(supabase, bookingId);
      return reply({ booking: updated });
    }

    return reply({ error: "Unknown action" }, 400);
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : String(err);
    console.error("bookings error:", message);
    return reply({ error: message }, 500);
  }
});
