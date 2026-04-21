import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, getBookingRequests, updateBookingStatus, deleteBookingRequest } from "@/lib/supabase-helpers";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Mail, Phone, Trash2 } from "lucide-react";

const statusColors: Record<string, string> = {
  new: "bg-primary/20 text-primary border-primary/30",
  accepted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  declined: "bg-destructive/20 text-destructive border-destructive/30",
};

const filters = ["all", "new", "accepted", "declined"] as const;

export default function Requests() {
  const [filter, setFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const { data: requests = [] } = useQuery({
    queryKey: ["booking-requests", profile?.id],
    queryFn: () => getBookingRequests(profile!.id),
    enabled: !!profile?.id,
  });

  const filtered = filter === "all" ? requests : requests.filter((r: any) => r.status === filter);

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateBookingStatus(id, status);
      queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
      toast.success(`Request ${status}`);
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this request? This cannot be undone.")) return;
    try {
      await deleteBookingRequest(id);
      queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
      toast.success("Request deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booking Requests</h1>
          <p className="text-muted-foreground mt-1">Manage your incoming bookings</p>
        </div>

        <div className="flex gap-2">
          {filters.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No {filter !== "all" ? filter : ""} requests</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">{r.client_name}</p>
                        <Badge variant="outline" className={statusColors[r.status] || ""}>{r.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.event_type} {r.event_date && `• ${format(new Date(r.event_date), "MMM d, yyyy")}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {r.status === "new" && (
                        <>
                          <Button size="sm" onClick={() => handleStatus(r.id, "accepted")} className="gap-1"><Check size={14} /> Accept</Button>
                          <Button size="sm" variant="outline" onClick={() => handleStatus(r.id, "declined")} className="gap-1"><X size={14} /> Decline</Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleDelete(r.id)} className="gap-1 text-destructive hover:text-destructive"><Trash2 size={14} /> Delete</Button>
                    </div>
                  </div>
                  {r.message && <p className="text-sm text-muted-foreground">{r.message}</p>}
                  {r.status === "accepted" && (
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground"><Mail size={14} /> {r.client_email}</span>
                      {r.client_phone && <span className="flex items-center gap-1 text-muted-foreground"><Phone size={14} /> {r.client_phone}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
