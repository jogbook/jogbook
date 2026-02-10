import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBookingRequest } from "@/lib/supabase-helpers";
import { toast } from "sonner";
import { z } from "zod";
import { CheckCircle } from "lucide-react";

const schema = z.object({
  client_name: z.string().trim().min(1, "Name is required").max(100),
  client_email: z.string().trim().email("Invalid email").max(255),
  client_phone: z.string().max(30).optional(),
  event_date: z.string().optional(),
  event_type: z.string().min(1, "Select an event type"),
  message: z.string().max(1000).optional(),
});

const eventTypes = [
  { value: "wedding", label: "Wedding" },
  { value: "corporate", label: "Corporate" },
  { value: "club", label: "Club Night" },
  { value: "festival", label: "Festival" },
  { value: "private", label: "Private Party" },
  { value: "other", label: "Other" },
];

export function BookingForm({ djId, djName }: { djId: string; djName: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    event_date: "",
    event_type: "",
    message: "",
  });

  const update = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await createBookingRequest({
        dj_id: djId,
        client_name: form.client_name.trim(),
        client_email: form.client_email.trim(),
        client_phone: form.client_phone.trim() || undefined,
        event_date: form.event_date || undefined,
        event_type: form.event_type,
        message: form.message.trim() || undefined,
      });
      setSubmitted(true);
    } catch {
      toast.error("Failed to submit. Please try again.");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-3">
        <CheckCircle className="mx-auto text-primary" size={48} />
        <h3 className="text-xl font-bold">Request Sent!</h3>
        <p className="text-muted-foreground">
          {djName} will review your booking request and get back to you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Your Name *</Label>
          <Input value={form.client_name} onChange={(e) => update("client_name", e.target.value)} className="bg-background" />
          {errors.client_name && <p className="text-xs text-destructive">{errors.client_name}</p>}
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input type="email" value={form.client_email} onChange={(e) => update("client_email", e.target.value)} className="bg-background" />
          {errors.client_email && <p className="text-xs text-destructive">{errors.client_email}</p>}
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.client_phone} onChange={(e) => update("client_phone", e.target.value)} className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label>Event Date</Label>
          <Input type="date" value={form.event_date} onChange={(e) => update("event_date", e.target.value)} className="bg-background" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Event Type *</Label>
        <Select value={form.event_type} onValueChange={(v) => update("event_type", v)}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.event_type && <p className="text-xs text-destructive">{errors.event_type}</p>}
      </div>
      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Tell me about your event..." className="bg-background" />
      </div>
      <Button type="submit" disabled={submitting} className="w-full font-bold">
        {submitting ? "Sending..." : "Send Booking Request"}
      </Button>
    </form>
  );
}
