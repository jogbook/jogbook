import { useState } from "react";
import { Menu, X, LayoutDashboard, User, Inbox, CreditCard, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import jogbookLogo from "@/assets/jogbook-logo.png";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "My Profile", icon: User },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/subscribe", label: "Subscribe", icon: CreditCard },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-30">
        <img src={jogbookLogo} alt="jogbook" className="h-7 w-auto" />
        <button onClick={() => setOpen(!open)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-20 bg-background/98 backdrop-blur-md pt-20 px-6">
          <nav className="flex flex-col gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-lg text-lg font-bold transition-all",
                    isActive ? "text-primary bg-primary/5" : "text-muted-foreground"
                  )
                }
              >
                <Icon size={20} />
                {label}
              </NavLink>
            ))}
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-lg font-bold text-muted-foreground hover:text-destructive mt-4"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
