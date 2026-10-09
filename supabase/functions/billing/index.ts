// JogBook's own products (Concierge etc.). Separate from DJ booking payments:
// gated by platform_settings.billing_enabled, never touches payouts.
// POST { action }
//   create_order  { product_code, origin }  -> PayPal approval URL
//   capture       { order_id }              -> server-side capture + verification
//   cancel        { order_id }              -> buyer cancelled at PayPal
//   admin_update  { service_request_id, status, admin_notes } (admin only)
//   admin_refund_mark { order_id }          (admin only; records a refund made in PayPal)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { json, requireUser, serviceClient } from "../_shared/db.ts";
import { paypalRequest } from "../_shared/providers/paypal.ts";

const reply = (body: unknown, status = 200) =>
  json(body, status, corsHeaders as unknown as Record<string, string>);

const SERVICE_STATUSES = ["pending", "in_progress", "completed", "refunded"];
const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const db = serviceClient();

  const audit = (actor: string | null, action: string, entity: string, entity_id: string | null, details: unknown = {}) =>
    db.from("billing_audit").insert({ actor_id: actor, action, entity, entity_id, details });

  try {
    const user = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "");

    const isAdmin = async () => {
      const { data } = await db.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      return !!data;
    };

    if (action === "create_order") {
      const { data: settings } = await db.from("platform_settings").select("billing_enabled").eq("id", true).single();
      const admin = await isAdmin();
      // Admins may test while billing is switched off; customers may not.
      if (!settings?.billing_enabled && !admin) return reply({ error: "Purchases are not open yet" }, 403);

      const code = String(body.product_code ?? "");
      const { data: product } = await db.from("billing_products").select("*").eq("code", code).maybeSingle();
      if (!product || !product.purchasable || product.kind !== "one_time") {
        return reply({ error: "This product is not available for purchase" }, 400);
      }
      let origin = String(body.origin ?? "");
      if (!/^https?:\/\/[^\s/]+$/.test(origin)) origin = "https://jogbook.com";

      const { data: order, error } = await db.from("billing_orders").insert({
        user_id: user.id, product_code: code, amount: product.price, currency: product.currency,
      }).select().single();
      if (error) throw new Error(error.message);

      const pp = await paypalRequest<{ id: string; links: { rel: string; href: string }[] }>(
        "/v2/checkout/orders", "POST",
        {
          intent: "CAPTURE",
          purchase_units: [{
            reference_id: order.id,
            custom_id: `billing:${order.id}`,
            description: product.name,
            amount: { currency_code: product.currency, value: Number(product.price).toFixed(2) },
          }],
          payment_source: { paypal: { experience_context: {
            brand_name: "JogBook",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: `${origin}/billing/return?order=${order.id}`,
            cancel_url: `${origin}/billing/return?order=${order.id}&cancelled=1`,
          } } },
        },
        `billing_order_${order.id}`,
      );
      await db.from("billing_orders").update({ paypal_order_id: pp.id }).eq("id", order.id);
      await audit(user.id, "checkout_started", "billing_order", order.id, { product: code });
      const approve = pp.links.find((l) => l.rel === "payer-action" || l.rel === "approve");
      return reply({ order_id: order.id, approve_url: approve?.href ?? null });
    }

    if (action === "capture" || action === "cancel") {
      const orderId = String(body.order_id ?? "");
      if (!UUID.test(orderId)) return reply({ error: "Invalid order" }, 400);
      const { data: order } = await db.from("billing_orders").select("*").eq("id", orderId).maybeSingle();
      if (!order || order.user_id !== user.id) return reply({ error: "Order not found" }, 404);
      if (order.status !== "PENDING") return reply({ order });

      if (action === "cancel") {
        const { data: upd } = await db.from("billing_orders").update({ status: "CANCELLED" })
          .eq("id", orderId).eq("status", "PENDING").select().single();
        await audit(user.id, "checkout_cancelled", "billing_order", orderId);
        return reply({ order: upd ?? order });
      }

      if (!order.paypal_order_id) return reply({ error: "Order was never sent to PayPal" }, 400);

      // Authoritative status from PayPal; capture if approved.
      let pp = await paypalRequest<any>(`/v2/checkout/orders/${order.paypal_order_id}`, "GET");
      if (pp.status === "APPROVED") {
        try {
          pp = await paypalRequest<any>(`/v2/checkout/orders/${order.paypal_order_id}/capture`, "POST", {}, `billing_capture_${order.id}`);
        } catch (e) {
          const msg = String(e);
          if (/INSTRUMENT_DECLINED|DECLINED|DENIED/.test(msg)) {
            const { data: upd } = await db.from("billing_orders").update({ status: "FAILED", failure_reason: "Payment was declined" })
              .eq("id", orderId).eq("status", "PENDING").select().single();
            await audit(user.id, "payment_failed", "billing_order", orderId, { reason: "declined" });
            return reply({ order: upd ?? order });
          }
          pp = await paypalRequest<any>(`/v2/checkout/orders/${order.paypal_order_id}`, "GET");
        }
      }

      const capture = pp.purchase_units?.[0]?.payments?.captures?.[0];
      const amountOk = capture &&
        Number(capture.amount?.value) === Number(order.amount) &&
        capture.amount?.currency_code === order.currency;

      if (pp.status === "COMPLETED" && capture?.status === "COMPLETED" && amountOk) {
        const { data: upd } = await db.from("billing_orders").update({
          status: "PAID", paypal_capture_id: capture.id, paid_at: new Date().toISOString(),
        }).eq("id", orderId).eq("status", "PENDING").select().single();
        if (upd) {
          await db.from("service_requests").upsert(
            { user_id: user.id, order_id: orderId, product_code: order.product_code },
            { onConflict: "order_id", ignoreDuplicates: true },
          );
          await audit(null, "payment_verified", "billing_order", orderId, { capture_id: capture.id });
        }
        return reply({ order: upd ?? order });
      }

      if (capture && ["DECLINED", "FAILED"].includes(capture.status)) {
        const { data: upd } = await db.from("billing_orders").update({ status: "FAILED", failure_reason: `Capture ${capture.status}` })
          .eq("id", orderId).eq("status", "PENDING").select().single();
        return reply({ order: upd ?? order });
      }
      // Still pending at PayPal (e.g. capture PENDING review) — leave as PENDING.
      return reply({ order, paypal_status: pp.status, capture_status: capture?.status ?? null });
    }

    if (action === "admin_update" || action === "admin_refund_mark") {
      if (!(await isAdmin())) return reply({ error: "Forbidden" }, 403);

      if (action === "admin_update") {
        const id = String(body.service_request_id ?? "");
        const status = String(body.status ?? "");
        if (!UUID.test(id) || !SERVICE_STATUSES.includes(status)) return reply({ error: "Invalid input" }, 400);
        const notes = String(body.admin_notes ?? "").slice(0, 4000);
        const { data, error } = await db.from("service_requests").update({ status, admin_notes: notes }).eq("id", id).select().single();
        if (error) throw new Error(error.message);
        await audit(user.id, "service_status_changed", "service_request", id, { status });
        return reply({ service_request: data });
      }

      const orderId = String(body.order_id ?? "");
      if (!UUID.test(orderId)) return reply({ error: "Invalid order" }, 400);
      const { data: order } = await db.from("billing_orders").select("*").eq("id", orderId).maybeSingle();
      if (!order || order.status !== "PAID" || !order.paypal_capture_id) return reply({ error: "Only paid orders can be refunded" }, 400);
      // Verify with PayPal that the capture really was refunded.
      const cap = await paypalRequest<any>(`/v2/payments/captures/${order.paypal_capture_id}`, "GET");
      if (!["REFUNDED", "PARTIALLY_REFUNDED"].includes(cap.status)) {
        return reply({ error: "PayPal does not show this payment as refunded yet. Refund it in PayPal first." }, 400);
      }
      const { data: upd } = await db.from("billing_orders").update({
        status: "REFUNDED", refunded_at: new Date().toISOString(), refund_amount: order.amount,
      }).eq("id", orderId).select().single();
      await db.from("service_requests").update({ status: "refunded" }).eq("order_id", orderId);
      await audit(user.id, "refund_recorded", "billing_order", orderId, { paypal_status: cap.status });
      return reply({ order: upd });
    }

    return reply({ error: "Unknown action" }, 400);
  } catch (err) {
    if (err instanceof Response) return new Response(err.body, { status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const message = err instanceof Error ? err.message : String(err);
    console.error("billing error:", message);
    return reply({ error: "Something went wrong with this payment. Please try again." }, 500);
  }
});
