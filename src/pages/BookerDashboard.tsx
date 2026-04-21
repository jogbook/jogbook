import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, CalendarHeart, MapPin, Phone, Building2 } from "lucide-react";
import jogbookLogo from "@/assets/jogbook-logo.png";

interface BookerProfile {
  full_name: string;
  company_or_event_type: string | null;
  location: string | null;
  phone: string | null;
}

export default function BookerDashboard() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<BookerProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("booker_profiles")
      .select("full_name, company_or_event_type, location, phone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data as BookerProfile | null));
  }, [user]);

  return (
    <div className="min-h-screen bg-background grain-overlay">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src={jogbookLogo} alt="jogbook" className="h-8 w-auto" />
          <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2">
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">Discover DJs and start booking events.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="grain-overlay">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <CalendarHeart size={18} />
                <h2 className="font-bold">Your details</h2>
              </div>
              <div className="space-y-2 text-sm">
                {profile?.company_or_event_type && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 size={14} /> {profile.company_or_event_type}
                  </div>
                )}
                {profile?.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin size={14} /> {profile.location}
                  </div>
                )}
                {profile?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone size={14} /> {profile.phone}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="grain-overlay">
            <CardContent className="p-6 space-y-2">
              <h2 className="font-bold">Find DJs</h2>
              <p className="text-sm text-muted-foreground">
                Browse public DJ profiles and submit booking requests directly from their page.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
