import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Users, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ReferralCardProps {
  referralCode?: string | null;
}

export function ReferralCard({ referralCode }: ReferralCardProps) {
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const link = useMemo(() => {
    if (!referralCode) return "";
    return `${window.location.origin}/signup?ref=${referralCode}`;
  }, [referralCode]);

  useEffect(() => {
    if (!referralCode) return;
    let cancelled = false;
    (async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", referralCode);
      if (!cancelled && !error) setCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [referralCode]);

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleShare = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me on jogbook", url: link });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  if (!referralCode) return null;

  return (
    <Card className="relative overflow-hidden grain-overlay">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Invite other DJs</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Share your referral link to invite DJs to jogbook.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/10">
            <Users className="text-primary" size={16} />
            <span className="text-sm font-semibold">{count ?? "—"} referred</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your referral code
          </label>
          <div className="font-mono text-lg font-bold tracking-wider">{referralCode}</div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your referral link
          </label>
          <div className="flex gap-2">
            <Input readOnly value={link} className="bg-card border-border h-11 font-mono text-sm" />
            <Button onClick={handleCopy} variant="outline" className="h-11 gap-2 shrink-0">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={handleShare} className="h-11 gap-2 shrink-0">
              <Share2 size={16} />
              Share
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
