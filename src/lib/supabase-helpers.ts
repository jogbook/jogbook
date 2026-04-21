import { supabase } from "@/integrations/supabase/client";

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return data;
}

export async function getProfileBySlug(slug: string) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
}

export async function updateProfile(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getBookingRequests(djId: string) {
  const { data } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("dj_id", djId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function createBookingRequest(request: {
  dj_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  event_date?: string;
  event_type: string;
  message?: string;
}) {
  const { error } = await supabase
    .from("booking_requests")
    .insert(request);
  if (error) throw error;
}

export async function updateBookingStatus(id: string, status: string) {
  const { error } = await supabase
    .from("booking_requests")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBookingRequest(id: string) {
  const { error } = await supabase
    .from("booking_requests")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
