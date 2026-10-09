import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getPlatformSettings } from "@/lib/payments";
import { billingAction, useIsAdminQueryFn } from "@/lib/billing";
import { SimpleShell } from "@/components/SimpleShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { data: settings } = useQuery({ queryKey: ["platform-settings", user?.id], queryFn: getPlatformSettings, enabled: !!user });
  const { data: isAdmin } = useQuery({ queryKey: ["is-admin", user?.id], queryFn: useIsAdminQueryFn(user?.id), enabled: !!user });
  const open = !!(settings as any)?.billing_enabled || !!isAdmin;

  const buyConcierge = async () => {
    if (!user) return navigate("/signup");
    setBusy(true);
    try {
      const { approve_url } = await billingAction<{ approve_url: string }>({
        action: "create_order", product_code: "DJ_CONCIERGE", origin: window.location.origin,
      });
      if (!approve_url) throw new Error("PayPal did not return a checkout link");
      window.location.href = approve_url;
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  const plans = [
    {
      name: "DJ Starter", price: "Free", note: "forever",
      points: ["Public DJ profile and booking link", "Unlimited booking inquiries", "Booking management dashboard"],
      cta: <Button asChild variant="outline" className="w-full"><Link to={user ? "/dashboard" : "/signup"}>{user ? "Go to dashboard" : "Join free"}</Link></Button>,
    },
    {
      name: "DJ Concierge Setup", price: "$49", note: "one-time",
      badge: "Manual service",
      points: [
        "The founder personally reviews and optimises your profile",
        "Booking link and onboarding set up with you",
        "Done by a person, not automated — usually started within 3 business days",
      ],
      cta: open ? (
        <Button className="w-full" onClick={buyConcierge} disabled={busy}>
          {busy ? <><Loader2 className="animate-spin" size={16} /> Opening PayPal…</> : "Buy with PayPal"}
        </Button>
      ) : <Button className="w-full" disabled>Opening soon</Button>,
    },
    {
      name: "Promoter Pilot", price: "$199", note: "per month",
      badge: "Coming soon",
      points: ["Up to 3 curated DJ shortlists per billing period", "Manual booking inquiry coordination", "No guaranteed bookings or artist availability"],
      cta: <Button className="w-full" disabled>Coming soon</Button>,
    },
    {
      name: "DJ Pro", price: "$19", note: "per month",
      badge: "Coming soon",
      points: ["Booking inquiry analytics", "Inquiry CSV exports", "Booking notification options"],
      cta: <Button className="w-full" disabled>Coming soon</Button>,
    },
  ];

  return (
    <SimpleShell>
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Pricing</h1>
        <p className="text-muted-foreground mt-2">Core booking tools stay free. Pay only for hands-on help.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <Card key={p.name} className="grain-overlay flex flex-col">
            <CardContent className="p-6 flex flex-col gap-4 flex-1">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold">{p.name}</h2>
                  {p.badge && <Badge variant="secondary" className="text-[10px]">{p.badge}</Badge>}
                </div>
                <p><span className="text-3xl font-bold">{p.price}</span> <span className="text-sm text-muted-foreground">{p.note}</span></p>
              </div>
              <ul className="space-y-2 text-sm flex-1">
                {p.points.map((pt) => (
                  <li key={pt} className="flex gap-2"><Check size={16} className="text-primary shrink-0 mt-0.5" />{pt}</li>
                ))}
              </ul>
              {p.cta}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-8">
        Prices in USD. Payments are processed by PayPal. See our <Link to="/terms" className="underline">Terms</Link>.
      </p>
    </SimpleShell>
  );
}
