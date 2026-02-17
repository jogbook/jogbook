import { useQuery } from "@tanstack/react-query";
import { getProfile, getBookingRequests, updateBookingStatus } from "@/lib/supabase-helpers";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Inbox, Clock, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  new: "bg-primary/15 text-primary border-primary/20",
  accepted: "bg-accent/15 text-accent border-accent/20",
  declined: "bg-destructive/15 text-destructive border-destructive/20",
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const { data: requests = [] } = useQuery({
    queryKey: ["booking-requests", profile?.id],
    queryFn: () => getBookingRequests(profile!.id),
    enabled: !!profile?.id,
  });

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateBookingStatus(id, status);
      queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
      toast.success(`Request ${status}`);
    } catch {
      toast.error("Failed to update request");
    }
  };

  const pending = requests.filter((r: any) => r.status === "new").length;
  const upcoming = requests.filter((r: any) => r.status === "accepted" && r.event_date && new Date(r.event_date) >= new Date()).length;

  const stats = [
    { label: "Total Requests", value: requests.length, icon: Inbox },
    { label: "Pending", value: pending, icon: Clock },
    { label: "Upcoming Gigs", value: upcoming, icon: CalendarDays },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back{profile?.name ? `, ${profile.name}` : ""}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="relative overflow-hidden grain-overlay">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/10">
                  <Icon className="text-primary" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Recent Requests</h2>
          {requests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No booking requests yet. Share your public profile to start receiving bookings!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 5).map((r: any) => (
                <Card key={r.id} className="hover:border-primary/20 transition-colors">
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{r.client_name}</p>
                        <Badge variant="outline" className={statusColors[r.status] || ""}>{r.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.event_type} {r.event_date && `• ${format(new Date(r.event_date), "MMM d, yyyy")}`}
                      </p>
                    </div>
                    {r.status === "new" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleStatus(r.id, "accepted")} className="gap-1">
                          <Check size={14} /> Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleStatus(r.id, "declined")} className="gap-1">
                          <X size={14} /> Decline
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
