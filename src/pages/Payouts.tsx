import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertTriangle, BadgeCheck, Banknote, Landmark, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProfile } from "@/lib/supabase-helpers";
import {
  connectPayoutAccount,
  formatMoney,
  getPayoutAccount,
  getPayouts,
  PAYOUT_ACCOUNT_COPY,
  PAYOUT_STATUS_STYLES,
  releasePayout,
  summarisePayouts,
  syncPayoutAccount,
  type PayoutAccountStatus,
  type PayoutStatus,
} from "@/lib/payments";

const COUNTRIES = [
  { code: "ZA", name: "South Africa" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
];

export default function Payouts() {
  const queryClient = useQueryClient();
  const [country, setCountry] = useState("ZA");
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const { data: account } = useQuery({ queryKey: ["payout-account"], queryFn: getPayoutAccount });
  const { data: payouts = [] } = useQuery({
    queryKey: ["payouts", profile?.id],
    queryFn: () => getPayouts(profile!.id),
    enabled: !!profile?.id,
  });

  const status = (account?.status ?? "NOT_CONNECTED") as PayoutAccountStatus;
  const copy = PAYOUT_ACCOUNT_COPY[status];
  const totals = summarisePayouts(payouts);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const { onboarding_url } = await connectPayoutAccount(account?.country ?? country);
      window.location.href = onboarding_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start onboarding");
    } finally {
      setBusy(false);
      queryClient.invalidateQueries({ queryKey: ["payout-account"] });
    }
  };

  const handleSync = async () => {
    setBusy(true);
    try {
      await syncPayoutAccount();
      queryClient.invalidateQueries({ queryKey: ["payout-account"] });
      toast.success("Payout status refreshed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not refresh status");
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async (id: string) => {
    try {
      await releasePayout(id);
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      toast.success("Payout sent to your provider account");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not release payout");
    }
  };

  const upcoming = payouts.filter((p: any) => ["NOT_ELIGIBLE", "PENDING", "PROCESSING"].includes(p.payout_status));
  const completed = payouts.filter((p: any) => ["PAID", "FAILED", "REVERSED"].includes(p.payout_status));

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
          <p className="text-muted-foreground mt-1">Get paid for your bookings</p>
        </div>

        <Card className="grain-overlay">
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/10">
                  <Landmark className="text-primary" size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">Payout account</p>
                    <Badge
                      variant="outline"
                      className={
                        copy.tone === "ok"
                          ? "bg-primary/15 text-primary border-primary/25"
                          : copy.tone === "warn"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }
                    >
                      {copy.tone === "ok" ? <BadgeCheck size={13} className="mr-1" /> : <AlertTriangle size={13} className="mr-1" />}
                      {copy.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 max-w-lg">{copy.detail}</p>
                  {account?.connected_account_id && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Connected account: <code>{account.connected_account_id}</code>
                      {account.payout_currency ? ` • payouts in ${account.payout_currency}` : ""}
                      {account.country ? ` • ${account.country}` : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!account?.connected_account_id && (
                  <Select value={account?.country ?? country} onValueChange={setCountry}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Country" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {status !== "PAYOUTS_ENABLED" && (
                  <Button onClick={handleConnect} disabled={busy} className="gap-2">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Banknote size={15} />}
                    {account?.connected_account_id ? "Continue setup" : "Connect payout account"}
                  </Button>
                )}
                {account?.connected_account_id && (
                  <Button variant="outline" onClick={handleSync} disabled={busy} className="gap-2">
                    <RefreshCw size={15} /> Refresh
                  </Button>
                )}
              </div>
            </div>

            {Array.isArray(account?.requirements) && account.requirements.length > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
                <p className="font-medium text-amber-700">The provider still needs:</p>
                <ul className="list-disc pl-5 text-muted-foreground mt-1">
                  {(account.requirements as string[]).map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
            )}

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" />
              Bank details are collected and verified on our payment provider's secure hosted pages.
              JogBook only stores your connected-account ID and its status — never bank credentials.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Available" value={formatMoney(totals.available, totals.currency)} />
          <Stat label="Pending" value={formatMoney(totals.pending, totals.currency)} />
          <Stat label="Paid out" value={formatMoney(totals.paidOut, totals.currency)} />
        </div>

        <PayoutList title="Upcoming payouts" rows={upcoming} onRelease={handleRelease} />
        <PayoutList title="Completed payouts" rows={completed} />
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function PayoutList({
  title,
  rows,
  onRelease,
}: {
  title: string;
  rows: any[];
  onRelease?: (id: string) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {rows.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Nothing here yet</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{formatMoney(p.net_amount, p.currency)}</p>
                    <Badge variant="outline" className={PAYOUT_STATUS_STYLES[p.payout_status as PayoutStatus]}>
                      {p.payout_status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gross {formatMoney(p.gross_amount, p.currency)} • JogBook fee{" "}
                    {formatMoney(p.platform_fee, p.currency)} ({Number(p.platform_fee_percent)}%)
                    {p.paid_at && ` • paid ${format(new Date(p.paid_at), "MMM d, yyyy")}`}
                  </p>
                  {p.failure_reason && (
                    <p className="text-xs text-destructive mt-1">{p.failure_reason}</p>
                  )}
                </div>
                {onRelease && p.payout_status === "PENDING" && (
                  <Button size="sm" variant="outline" onClick={() => onRelease(p.id)}>
                    Release now
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
