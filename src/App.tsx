import { Toaster } from "@/components/ui/toaster";
import { Terms, Privacy } from "./pages/Legal";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import DashboardRouter from "./pages/DashboardRouter";
import Dashboard from "./pages/Dashboard";
import ProfileEditor from "./pages/ProfileEditor";
import Requests from "./pages/Requests";
import Earnings from "./pages/Earnings";
import Payouts from "./pages/Payouts";
import Checkout from "./pages/Checkout";

import PublicProfile from "./pages/PublicProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfileEditor /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
            <Route path="/earnings" element={<ProtectedRoute><Earnings /></ProtectedRoute>} />
            <Route path="/payouts" element={<ProtectedRoute><Payouts /></ProtectedRoute>} />
            <Route path="/pay/:token" element={<Checkout />} />
            <Route path="/dj/:slug" element={<PublicProfile />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Aliases: common URL spellings resolve to the existing pages instead of 404 */}
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/sign-in" element={<Navigate to="/auth" replace />} />
            <Route path="/register" element={<Navigate to="/signup" replace />} />
            <Route path="/sign-up" element={<Navigate to="/signup" replace />} />
            <Route path="/home" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dj-dashboard" element={<Navigate to="/dashboard" replace />} />
            <Route path="/client-dashboard" element={<Navigate to="/dashboard" replace />} />
            <Route path="/booker-dashboard" element={<Navigate to="/dashboard" replace />} />
            <Route path="/bookings" element={<Navigate to="/requests" replace />} />
            <Route path="/booking-requests" element={<Navigate to="/requests" replace />} />
            <Route path="/payments" element={<Navigate to="/earnings" replace />} />
            <Route path="/settings" element={<Navigate to="/profile" replace />} />
            <Route path="/account" element={<Navigate to="/profile" replace />} />
            <Route path="/my-profile" element={<Navigate to="/profile" replace />} />
            <Route path="/checkout/:token" element={<Checkout />} />
            <Route path="/djs/:slug" element={<PublicProfile />} />
            <Route path="/profile/:slug" element={<PublicProfile />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
