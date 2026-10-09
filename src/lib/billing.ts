import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export async function billingAction<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("billing", { body });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      try { message = (await error.context.json()).error ?? message; } catch { /* keep */ }
    }
    throw new Error(message);
  }
  return data as T;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const SERVICE_STATUS_LABEL: Record<string, string> = {
  pending: "Waiting to start",
  in_progress: "In progress",
  completed: "Completed",
  refunded: "Refunded",
};

export function useIsAdminQueryFn(userId?: string) {
  return async () => {
    if (!userId) return false;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    return !!data;
  };
}
