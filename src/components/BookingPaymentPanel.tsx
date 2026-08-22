import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, Circle, Copy, Loader2, PartyPopper, Send, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  bookingPayUrl,
  formatMoney,
  markGigCompleted,
  requestBalance,
  setBookingTerms,
  type DepositType,
} from "@/lib/payments";

interface Props {
  booking: any;
  settings: any;
  djProfile?: any;
}

export function BookingPaymentPanel({ booking, settings, djProfile }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // DJ profile deposit preference seeds the terms until the booking has its own.
  const profileAcceptsDeposit = djProfile?.accepts_deposit ?? true;
  const profileDepositType: DepositType = !profileAcceptsDeposit
    ? "FULL"
    : djProfile?.deposit_type === "FIXED"
      ? "FIXED"
      : "PERCENTAGE";
  const profileDepositValue =
    profileDepositType === "FIXED"
      ? Number(djProfile?.deposit_amount ?? 0)
      : Number(djProfile?.deposit_percent ?? settings?.default_deposit_percent ?? 30);

  const currencies: string[] = settings?.supported_currencies ?? ["USD"];
  const [fee, setFee] = useState(String(booking.performance_fee ?? ""));
  const [currency, setCurrency] = useState(booking.booking_currency ?? settings?.default_currency ?? "USD");
  const [depositType, setDepositType] = useState<DepositType>(
    booking.performance_fee ? (booking.deposit_type ?? "PERCENTAGE") : profileDepositType,
  );
  const [depositValue, setDepositValue] = useState(
    String(booking.performance_fee ? (booking.deposit_value ?? profileDepositValue) : profileDepositValue),
  );
  const [deadline, setDeadline] = useState(
    booking.payment_deadline ? booking.payment_deadline.slice(0, 10) : "",
  );
  const [terms, setTerms] = useState(booking.terms ?? "");

  const performanceFee = Number(booking.performance_fee ?? 0);
  const paid = Number(booking.amount_paid ?? 0);
  const deposit = Number(booking.deposit_amount ?? 0);
  const outstanding = Math.round((performanceFee - paid) * 100) / 100;
  const hasTerms = performanceFee > 0;
  const locked = paid > 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["booking-requests"] });

  const saveTerms = async () => {
    setBusy(true);
    try {
      await setBookingTerms({
        booking_id: booking.id,
        performance_fee: Number(fee),
        booking_currency: currency,
        deposit_type: depositType,
        deposit_value: depositType === "FULL" ? 0 : Number(depositValue),
        payment_deadline: deadline ? new Date(deadline).toISOString() : undefined,
        terms,
      });
      toast.success("Payment terms saved — share the payment link with your client");
      setOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save terms");
    } finally {
      setBusy(false);
    }
  };

  const action = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(message);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet size={15} className="text-primary" />
          <p className="text-sm font-semibold">Payment</p>
          {booking.gig_state === "GIG_COMPLETED" && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25">
              GIG COMPLETED
            </Badge>
          )}
          <Badge variant="outline">{booking.payment_state}</Badge>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={locked}>
              {hasTerms ? "Edit terms" : "Set fee & deposit"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Payment terms</DialogTitle>
              <DialogDescription>
                The booking amount and currency are locked in for accounting once a payment is made.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="fee">Performance fee</Label>
                  <Input id="fee" type="number" min="1" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="1000.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Deposit</Label>
                  <Select value={depositType} onValueChange={(v) => setDepositType(v as DepositType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FIXED">Fixed amount</SelectItem>
                      <SelectItem value="FULL">Full payment upfront</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {depositType !== "FULL" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="dv">{depositType === "PERCENTAGE" ? "Percent" : "Amount"}</Label>
                    <Input id="dv" type="number" min="0" step="0.01" value={depositValue} onChange={(e) => setDepositValue(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                {profileAcceptsDeposit
                  ? `Your profile default: ${
                      profileDepositType === "FIXED"
                        ? formatMoney(profileDepositValue, currency)
                        : `${profileDepositValue}%`
                    } deposit.`
                  : "Your profile has deposits switched off, so full payment upfront is pre-selected."}
              </p>

                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deadline">Payment deadline</Label>
                <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="terms">Cancellation / payment terms</Label>
                <Textarea id="terms" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Deposit is non-refundable within 14 days of the event…" />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={saveTerms} disabled={busy}>
                {busy && <Loader2 size={15} className="animate-spin" />} Save terms
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!hasTerms ? (
        <p className="text-sm text-muted-foreground">
          Set the performance fee and deposit to generate a secure payment link for this client.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Figure label="Total" value={formatMoney(performanceFee, booking.booking_currency)} />
            <Figure
              label="Deposit paid"
              value={formatMoney(Math.min(paid, deposit || paid), booking.booking_currency)}
              icon={paid > 0}
            />
            <Figure
              label="Balance due"
              value={formatMoney(Math.max(outstanding, 0), booking.booking_currency)}
              icon={outstanding <= 0}
            />
            <Figure
              label="Deadline"
              value={booking.payment_deadline ? format(new Date(booking.payment_deadline), "MMM d") : "—"}
            />
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(bookingPayUrl(booking.access_token));
                toast.success("Payment link copied");
              }}
            >
              <Copy size={14} /> Copy payment link
            </Button>

            {booking.gig_state !== "GIG_COMPLETED" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={busy}
                onClick={() => action(() => markGigCompleted(booking.id), "Gig marked completed")}
              >
                <PartyPopper size={14} /> Mark gig completed
              </Button>
            )}

            {outstanding > 0 && (
              <Button
                size="sm"
                className="gap-1.5"
                disabled={busy}
                onClick={() => action(() => requestBalance(booking.id), "Balance requested")}
              >
                <Send size={14} /> Request balance
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Figure({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {icon === true && <CheckCircle2 size={12} className="text-primary" />}
        {icon === false && <Circle size={12} />}
        {label}
      </p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
