import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import jogbookLogo from "@/assets/jogbook-logo.png";

export function SimpleShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background grain-overlay">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/"><img src={jogbookLogo} alt="jogbook" className="h-8 w-auto" /></Link>
          <nav className="flex items-center gap-1 text-sm">
            <Button asChild variant="ghost" size="sm"><Link to="/pricing">Pricing</Link></Button>
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/billing">Billing</Link></Button>
                <Button asChild size="sm"><Link to="/dashboard">Dashboard</Link></Button>
              </>
            ) : (
              <Button asChild size="sm"><Link to="/signup">Join free</Link></Button>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">{children}</main>
    </div>
  );
}
