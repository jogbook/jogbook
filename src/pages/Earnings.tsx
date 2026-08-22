import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowUpRight, Coins, PiggyBank, Receipt, TrendingUp, Wallet } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBookingRequests, getProfile } from "@/lib/supabase-helpers";
import {
  formatMoney,
  getPayments,
  getPayouts,
  METHOD_LABELS,
  PAYMENT_STATUS_STYLES,
  PAYOUT_STATUS_STYLES,
  summarisePayouts,
  type PaymentMethod,
  type PaymentStatus,
  type PayoutStatus,
} from "@/lib/payments";

export default function Earnings() {
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const { data: payouts = [] } = useQuery({
    queryKey: ["payouts", profile?.id],
    queryFn: () => getPayouts(profile!.id),
    enabled: !!profile?.id,
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments", profile?.id],
    queryFn: () => getPayments(profile!.id),
    enabled: !!profile?.id,
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ["booking-requests", profile?.id],
    queryFn: () => getBookingRequests(profile!.id),
    enabled: !!profile?.id,
  });

  const totals = summarisePayouts(payouts);
  const bookingById = new Map(bookings.map((b: any) => [b.id, b]));
  const payoutByPayment = new Map(payouts.map((p: any) => [p.payment_id, p]));

  const stats = [
    { label: "Available", value: formatMoney(totals.available, totals.currency), icon: Wallet },
    { label: "Pending", value: formatMoney(totals.pending, totals.currency), icon: Coins },
    { label: "Total earned", value: formatMoney(totals.net, totals.currency), icon: TrendingUp },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My earnings</h1>
            <p className="text-muted-foreground mt-1">Every booking, fee and payout in one place</p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/payouts">View payouts <ArrowUpRight size={15} /></Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="grain-overlay">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/10">
                  <Icon className="text-primary" size={20} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold tracking-tight">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MiniStat label="Gross booking volume" value={formatMoney(totals.gross, totals.currency)} icon={Receipt} />
          <MiniStat label="JogBook fees" value={formatMoney(totals.platformFees, totals.currency)} icon={Receipt} />
          <MiniStat label="Paid out to your bank" value={formatMoney(totals.paidOut, totals.currency)} icon={PiggyBank} />
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Earnings breakdown
          </h2>
          {payments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No client payments yet. Set a fee on an accepted booking and share the payment link.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {payments.map((payment: any) => {
                const booking: any = bookingById.get(payment.booking_id);
                const payout: any = payoutByPayment.get(payment.id);
                return (
                  <Card key={payment.id}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {booking?.event_type ?? "Booking"}
                            <span className="text-muted-foreground font-normal">
                              {" "}• {booking?.client_name ?? payment.client_email}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {booking?.event_date
                              ? format(new Date(booking.event_date), "MMM d, yyyy")
                              : "Date TBC"}
                            {" • "}
                            {payment.payment_type.toLowerCase()} via {METHOD_LABELS[payment.payment_method as PaymentMethod]}
                            {payment.crypto_asset ? ` (${payment.crypto_asset} on ${payment.crypto_network})` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className={PAYMENT_STATUS_STYLES[payment.payment_status as PaymentStatus]}>
                            Payment {payment.payment_status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={PAYOUT_STATUS_STYLES[(payout?.payout_status ?? "NOT_ELIGIBLE") as PayoutStatus]}
                          >
                            Payout {payout?.payout_status ?? "NOT_ELIGIBLE"}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <Figure label="Gross booking fee" value={formatMoney(payment.booking_amount, payment.booking_currency)} />
                        <Figure
                          label="JogBook commission"
                          value={payout ? formatMoney(payout.platform_fee, payout.currency) : "—"}
                          hint={payout ? `${Number(payout.platform_fee_percent)}%` : undefined}
                        />
                        <Figure label="Net DJ earnings" value={payout ? formatMoney(payout.net_amount, payout.currency) : "—"} />
                        <Figure
                          label="Payout date"
                          value={payout?.paid_at ? format(new Date(payout.paid_at), "MMM d, yyyy") : "—"}
                        />
                      </div>

                      {payment.currency !== payment.booking_currency && (
                        <p className="text-xs text-muted-foreground">
                          Client paid {formatMoney(payment.amount, payment.currency)} at a rate of{" "}
                          {Number(payment.exchange_rate).toFixed(4)} — booking value stays{" "}
                          {formatMoney(payment.booking_amount, payment.booking_currency)}.
                        </p>
                      )}
                      {payment.transaction_hash && (
                        <p className="text-xs text-muted-foreground break-all">
                          Tx: {payment.transaction_hash}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-3">
        <Icon size={16} className="text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">
        {value} {hint && <span className="text-xs text-muted-foreground font-normal">{hint}</span>}
      </p>
    </div>
  );
}
