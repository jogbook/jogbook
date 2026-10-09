import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { billingAction, ORDER_STATUS_LABEL, SERVICE_STATUS_LABEL } from "@/lib/billing";
import { formatMoney } from "@/lib/payments";
import { SimpleShell } from "@/components/SimpleShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Billing() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const returnOrder = params.get("order");
  const cancelled = params.get("cancelled") === "1";
  const [checking, setChecking] = useState(!!returnOrder);
  const [result, setResult] = useState<{ status: string; reason?: string } | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!returnOrder || ran.current) return;
    ran.current = true;
    billingAction<{ order: any }>({ action: cancelled ? "cancel" : "capture", order_id: returnOrder })
      .then(({ order }) => setResult({ status: order.status, reason: order.failure_reason }))
      .catch((e) => setResult({ status: "ERROR", reason: (e as Error).message }))
      .finally(() => {
        setChecking(false);
        qc.invalidateQueries({ queryKey: ["billing"] });
      });
  }, [returnOrder, cancelled, qc]);

  const { data: orders = [] } = useQuery({
    queryKey: ["billing", "orders", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("billing_orders").select("*, billing_products(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: services = [] } = useQuery({
    queryKey: ["billing", "services", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("service_requests").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const sendSupport = async () => {
    if (!user || !subject.trim() || !message.trim()) return;
    setSending(true);
    const { error } = await supabase.from("support_requests").insert({ user_id: user.id, subject: subject.trim().slice(0, 200), message: message.trim().slice(0, 4000) });
    setSending(false);
    if (error) return toast.error("Could not send your request");
    setSubject(""); setMessage("");
    toast.success("Thanks — we'll get back to you by email.");
  };

  const banner = () => {
    if (!returnOrder) return null;
    if (checking) return <><Loader2 className="animate-spin" size={18} /> Confirming your payment with PayPal…</>;
    switch (result?.status) {
      case "PAID": return <>Payment confirmed. Your Concierge Setup is booked — we'll email you to get started.</>;
      case "CANCELLED": return <>Checkout cancelled. You haven't been charged.</>;
      case "FAILED": return <>Payment failed{result.reason ? `: ${result.reason}` : ""}. You haven't been charged.</>;
      case "PENDING": return <>PayPal hasn't confirmed this payment yet. We'll update this page once it does.</>;
      default: return <>We couldn't confirm this payment: {result?.reason}</>;
    }
  };

  return (
    <SimpleShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground mt-1">Your JogBook purchases and services.</p>
        </div>

        {returnOrder && (
          <Card className={result?.status === "PAID" ? "border-primary" : ""}>
            <CardContent className="p-5 flex items-center gap-3 flex-wrap">
              {banner()}
              {!checking && <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setParams({})}>Dismiss</Button>}
            </CardContent>
          </Card>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Your services</h2>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services yet. <Link to="/pricing" className="text-primary underline">See pricing</Link>.</p>
          ) : services.map((s: any) => (
            <Card key={s.id}><CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{s.product_code === "DJ_CONCIERGE" ? "DJ Concierge Setup" : s.product_code}</p>
                <p className="text-sm text-muted-foreground">Ordered {new Date(s.created_at).toLocaleDateString()}</p>
              </div>
              <Badge variant={s.status === "completed" ? "default" : "secondary"}>{SERVICE_STATUS_LABEL[s.status]}</Badge>
            </CardContent></Card>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Billing history</h2>
          {orders.length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> : (
            <div className="space-y-2">
              {orders.map((o: any) => (
                <Card key={o.id}><CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.billing_products?.name ?? o.product_code}</p>
                    <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {formatMoney(o.amount, o.currency)}</p>
                  </div>
                  <Badge variant={o.status === "PAID" ? "default" : "secondary"}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                </CardContent></Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 max-w-xl">
          <h2 className="text-xl font-bold">Need help?</h2>
          <Input placeholder="Subject" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Tell us what you need, including any order details" value={message} maxLength={4000} rows={4} onChange={(e) => setMessage(e.target.value)} />
          <Button onClick={sendSupport} disabled={sending || !subject.trim() || !message.trim()}>
            {sending ? "Sending…" : "Send request"}
          </Button>
        </section>
      </div>
    </SimpleShell>
  );
}
