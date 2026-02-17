import { LayoutDashboard, User, Inbox, CreditCard, LogOut, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/supabase-helpers";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import jogbookLogo from "@/assets/jogbook-logo.png";

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
    <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-sidebar border-r border-sidebar-border z-20">
      <div className="p-6 pb-8">
        <img src={jogbookLogo} alt="jogbook" className="h-9 w-auto" />
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(120_100%_40%/0.15)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        {profile?.slug && (
          <a
            href={`/dj/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-secondary"
          >
            <ExternalLink size={14} />
            View public profile
          </a>
        )}
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
