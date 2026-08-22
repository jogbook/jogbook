import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Wallet,
  Copy,
} from "lucide-react";
import {
  createCheckout,
  formatCrypto,
  formatMoney,
  getCheckoutSummary,
  isCryptoMethod,
  METHOD_LABELS,
  type PaymentMethod,
  type PaymentType,
} from "@/lib/payments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import jogbookLogo from "@/assets/jogbook-logo.png";

const METHOD_ORDER: PaymentMethod[] = ["CARD", "PAYPAL", "USDC", "USDT", "SOL", "ETH", "BTC"];

export default function Checkout() {
  const { token = "" } = useParams();
  const [searchParams] = useSearchParams();
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [currency, setCurrency] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const [crypto, setCrypto] = useState<
    { asset: string; network: string; amount: number; address: string } | null
  >(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["checkout", token],
    queryFn: () => getCheckoutSummary(token),
    enabled: !!token,
    refetchInterval: 15000,
  });

  const status = searchParams.get("status");
  useEffect(() => {
    if (status === "success") {
      toast.success("Thanks! We're confirming your payment with the provider.");
    } else if (status === "cancelled") {
      toast.info("Payment cancelled — nothing was charged.");
    }
  }, [status]);

  const booking = data?.booking;
  const dj = data?.dj;

  useEffect(() => {
    if (booking?.booking_currency && !currency) setCurrency(booking.booking_currency);
  }, [booking?.booking_currency, currency]);

  const fee = Number(booking?.performance_fee ?? 0);
  const paid = Number(booking?.amount_paid ?? 0);
  const deposit = Number(booking?.deposit_amount ?? 0);
  const outstanding = Math.round((fee - paid) * 100) / 100;
  const depositPaid = paid > 0;
  const complete = booking?.payment_state === "PAYMENT_COMPLETE";

  const paymentType: PaymentType = useMemo(() => {
    if (!depositPaid && deposit > 0 && deposit < fee) return "DEPOSIT";
    if (depositPaid) return "BALANCE";
    return "FULL";
  }, [depositPaid, deposit, fee]);

  const methods = data?.settings.methods.filter((m) => METHOD_ORDER.includes(m.method)) ?? [];
  const isCrypto = isCryptoMethod(method);

  const handlePay = async () => {
    setStarting(true);
    setCrypto(null);
    try {
      const result = await createCheckout({
        token,
        payment_type: paymentType,
        method,
        currency: isCrypto ? booking.booking_currency : currency || booking.booking_currency,
      });
      if (result.crypto) setCrypto(result.crypto);
      if (result.checkout_url) window.location.href = result.checkout_url;
      else if (!result.crypto) toast.error("The provider did not return a checkout link.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <img src={jogbookLogo} alt="jogbook" className="h-8 w-auto mb-6" />
        <h1 className="text-2xl font-bold">This booking link isn't valid</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          {error instanceof Error ? error.message : "Ask your DJ to resend the payment link."}
        </p>
      </div>
    );
  }

  const notAccepted = booking.status !== "accepted" || fee <= 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <img src={jogbookLogo} alt="jogbook" className="h-7 w-auto" />
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock size={13} /> Secure checkout
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <section className="space-y-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 uppercase tracking-wide">
            {complete ? "Payment complete" : booking.gig_state === "GIG_COMPLETED" ? "Gig completed" : "Booking confirmed"}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">
            {dj?.stage_name || dj?.name || "Your DJ"}
          </h1>
          <p className="text-muted-foreground">
            {booking.event_type}
            {booking.event_date && ` • ${format(new Date(booking.event_date), "MMMM d, yyyy")}`}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Row label="Performance fee" value={formatMoney(fee, booking.booking_currency)} strong />
          <Row
            label="Deposit required"
            value={formatMoney(deposit, booking.booking_currency)}
            icon={depositPaid ? "done" : "open"}
            note={depositPaid ? "Deposit received" : undefined}
          />
          <Row
            label="Remaining balance"
            value={formatMoney(Math.max(outstanding, 0), booking.booking_currency)}
            icon={outstanding <= 0 ? "done" : "open"}
            note={outstanding > 0 ? "Due after the performance" : "Settled"}
          />
          {booking.payment_deadline && !complete && (
            <Row
              label="Payment deadline"
              value={format(new Date(booking.payment_deadline), "MMM d, yyyy")}
            />
          )}
          {booking.terms && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Cancellation & payment terms
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.terms}</p>
              </div>
            </>
          )}
        </section>

        {complete ? (
          <section className="rounded-xl border border-primary/25 bg-primary/5 p-6 text-center space-y-1">
            <CheckCircle2 className="mx-auto text-primary" />
            <p className="font-semibold">This booking is paid in full</p>
            <p className="text-sm text-muted-foreground">
              {formatMoney(fee, booking.booking_currency)} received. Nothing else to pay.
            </p>
          </section>
        ) : notAccepted ? (
          <section className="rounded-xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            Your DJ hasn't finalised the fee for this booking yet. You'll be able to pay here as soon
            as they do.
          </section>
        ) : (
          <section className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Pay with
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {methods.map(({ method: m, available }) => (
                  <button
                    key={m}
                    onClick={() => { setMethod(m); setCrypto(null); }}
                    disabled={!available}
                    title={available ? undefined : "Not connected on this environment yet"}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                      method === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    } ${available ? "" : "opacity-40 cursor-not-allowed"}`}
                  >
                    <span className="flex flex-col items-center gap-1.5">
                      {m === "CARD" ? <CreditCard size={16} /> : <Wallet size={16} />}
                      {METHOD_LABELS[m]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {!isCrypto && (data?.settings.supported_currencies?.length ?? 0) > 1 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Pay in</span>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {data!.settings.supported_currencies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currency !== booking.booking_currency && (
                  <span className="text-xs text-muted-foreground">
                    Booking stays {formatMoney(fee, booking.booking_currency)} — converted at checkout.
                  </span>
                )}
              </div>
            )}

            {crypto && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-sm font-semibold">
                  Send {formatCrypto(crypto.amount, crypto.asset)} on {crypto.network}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 break-all">
                    {crypto.address}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(crypto.address);
                      toast.success("Address copied");
                    }}
                  >
                    <Copy size={14} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your payment is marked as paid only once the network confirmation reaches JogBook
                  from the payment provider.
                </p>
              </div>
            )}

            <Button size="lg" className="w-full h-14 text-base" onClick={handlePay} disabled={starting}>
              {starting ? <Loader2 className="animate-spin" /> : null}
              {paymentType === "BALANCE"
                ? `Pay ${formatMoney(outstanding, booking.booking_currency)} balance`
                : paymentType === "DEPOSIT"
                ? `Pay ${formatMoney(deposit, booking.booking_currency)} deposit`
                : `Pay ${formatMoney(outstanding, booking.booking_currency)}`}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck size={13} /> Card • PayPal • Crypto — processed by our payment provider.
              JogBook never stores your card or wallet details.
            </p>
          </section>
        )}

        {(data?.payments.length ?? 0) > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Payment history
            </h2>
            <div className="rounded-xl border border-border divide-y divide-border">
              {data!.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium capitalize">{p.payment_type.toLowerCase()} • {METHOD_LABELS[p.payment_method as PaymentMethod]}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.created_at), "MMM d, yyyy p")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatMoney(p.amount, p.currency)}</p>
                    <p className="text-xs text-muted-foreground">{p.payment_status}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  icon,
  note,
}: {
  label: string;
  value: string;
  strong?: boolean;
  icon?: "done" | "open";
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2">
        {icon === "done" && <CheckCircle2 size={15} className="text-primary" />}
        {icon === "open" && <Circle size={15} className="text-muted-foreground" />}
        <div>
          <p className={strong ? "font-semibold" : "text-sm text-muted-foreground"}>{label}</p>
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </div>
      </div>
      <p className={strong ? "text-2xl font-bold tracking-tight" : "font-semibold"}>{value}</p>
    </div>
  );
}
