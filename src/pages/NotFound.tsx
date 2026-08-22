import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const links = user
    ? [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/profile", label: "My Profile" },
        { to: "/requests", label: "Requests" },
        { to: "/earnings", label: "Earnings" },
        { to: "/payouts", label: "Payouts" },
      ]
    : [
        { to: "/auth", label: "Sign in" },
        { to: "/signup", label: "Create an account" },
      ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="text-center max-w-md">
        <h1 className="mb-3 text-4xl font-bold">404</h1>
        <p className="mb-1 text-xl text-muted-foreground">This page doesn't exist</p>
        <p className="mb-6 text-sm text-muted-foreground break-all">{location.pathname}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {links.map(({ to, label }) => (
            <Button key={to} asChild variant="outline" size="sm">
              <Link to={to}>{label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
