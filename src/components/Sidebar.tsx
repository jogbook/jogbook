import { LayoutDashboard, User, Inbox, CreditCard, LogOut, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/supabase-helpers";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "My Profile", icon: User },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/subscribe", label: "Subscribe", icon: CreditCard },
];

export function Sidebar() {
  const { signOut } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  return (
    <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-card border-r border-border z-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tighter">
          <span className="text-primary">jog</span>
          <span className="text-foreground">book</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        {profile?.slug && (
          <a
            href={`/dj/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink size={14} />
            View public profile
          </a>
        )}
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
