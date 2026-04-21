import { useUserRole } from "@/hooks/useUserRole";
import Dashboard from "@/pages/Dashboard";
import BookerDashboard from "@/pages/BookerDashboard";

export default function DashboardRouter() {
  const { data: role, isLoading } = useUserRole();
  if (isLoading) return <div className="min-h-screen bg-background" />;
  if (role === "booker") return <BookerDashboard />;
  return <Dashboard />;
}
