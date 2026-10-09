import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { billingAction, ORDER_STATUS_LABEL, SERVICE_STATUS_LABEL, useIsAdminQueryFn } from "@/lib/billing";
import { formatMoney } from "@/lib/payments";
import { SimpleShell } from "@/components/SimpleShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function toCsv(rows: any[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== "object" || rows[0][k] === null);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}
function download(name: string, rows: any[]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export default function Admin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: isAdmin, isLoading } = useQuery({ queryKey: ["is-admin", user?.id], queryFn: useIsAdminQueryFn(user?.id), enabled: !!user });
  const q = (table: string) => async () => (await supabase.from(table as any).select("*").order("created_at", { ascending: false })).data ?? [];
  const { data: orders = [] } = useQuery({ queryKey: ["admin", "orders"], queryFn: q("billing_orders"), enabled: !!isAdmin });
  const { data: services = [] } = useQuery({ queryKey: ["admin", "services"], queryFn: q("service_requests"), enabled: !!isAdmin });
  const { data: support = [] } = useQuery({ queryKey: ["admin", "support"], queryFn: q("support_requests"), enabled: !!isAdmin });
  const { data: audit = [] } = useQuery({ queryKey: ["admin", "audit"], queryFn: q("billing_audit"), enabled: !!isAdmin });

  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const paid = (orders as any[]).filter((o) => o.status === "PAID");
  const refunded = (orders as any[]).filter((o) => o.status === "REFUNDED");
  const gross = paid.reduce((s, o) => s + Number(o.amount), 0);
  const started = (audit as any[]).filter((a) => a.action === "checkout_started").length;

  const setStatus = async (id: string, status: string) => {
    try { await billingAction({ action: "admin_update", service_request_id: id, status }); toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin"] }); }
    catch (e) { toast.error((e as Error).message); }
  };
  const markRefund = async (id: string) => {
    if (!confirm("Record this order as refunded? Refund it in PayPal first — we check PayPal before saving.")) return;
    try { await billingAction({ action: "admin_refund_mark", order_id: id }); toast.success("Refund recorded"); qc.invalidateQueries({ queryKey: ["admin"] }); }
    catch (e) { toast.error((e as Error).message); }
  };

  const stats = [
    ["Verified revenue (one-time)", formatMoney(gross)],
    ["Paid orders", String(paid.length)],
    ["Checkout starts", String(started)],
    ["Conversion", started ? `${Math.round((paid.length / started) * 100)}%` : "—"],
    ["Pending services", String((services as any[]).filter((s) => s.status === "pending" || s.status === "in_progress").length)],
    ["Refunded", String(refunded.length)],
    ["Monthly recurring", "$0 (no subscriptions yet)"],
  ];

  return (
    <SimpleShell>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(([k, v]) => (
            <Card key={k}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-xl font-bold">{v}</p></CardContent></Card>
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Service queue</h2>
          {(services as any[]).length === 0 && <p className="text-sm text-muted-foreground">No paid services yet.</p>}
          {(services as any[]).map((s) => (
            <Card key={s.id}><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{s.product_code}</p>
                <p className="text-xs text-muted-foreground break-all">Customer {s.user_id} · {new Date(s.created_at).toLocaleString()}</p>
              </div>
              <Select value={s.status} onValueChange={(v) => setStatus(s.id, v)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(SERVICE_STATUS_LABEL).filter(([k]) => k !== "refunded").map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent></Card>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Orders</h2>
            <Button variant="outline" size="sm" onClick={() => download("orders.csv", orders as any[])}>Export CSV</Button>
          </div>
          {(orders as any[]).map((o) => (
            <Card key={o.id}><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{o.product_code} · {formatMoney(o.amount, o.currency)}</p>
                <p className="text-xs text-muted-foreground break-all">{new Date(o.created_at).toLocaleString()} · PayPal {o.paypal_capture_id ?? o.paypal_order_id ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={o.status === "PAID" ? "default" : "secondary"}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                {o.status === "PAID" && <Button size="sm" variant="ghost" onClick={() => markRefund(o.id)}>Record refund</Button>}
              </div>
            </CardContent></Card>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Support requests</h2>
          {(support as any[]).length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {(support as any[]).map((s) => (
            <Card key={s.id}><CardContent className="p-4 space-y-1">
              <p className="font-semibold">{s.subject}</p>
              <p className="text-sm whitespace-pre-wrap">{s.message}</p>
              <p className="text-xs text-muted-foreground break-all">Customer {s.user_id} · {new Date(s.created_at).toLocaleString()}</p>
            </CardContent></Card>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Audit trail</h2>
            <Button variant="outline" size="sm" onClick={() => download("audit.csv", audit as any[])}>Export CSV</Button>
          </div>
          <div className="text-sm space-y-1">
            {(audit as any[]).slice(0, 50).map((a) => (
              <p key={a.id} className="text-muted-foreground">{new Date(a.created_at).toLocaleString()} — {a.action} ({a.entity})</p>
            ))}
          </div>
        </section>
      </div>
    </SimpleShell>
  );
}
