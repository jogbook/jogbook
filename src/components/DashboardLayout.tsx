import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <MobileNav />
      <Sidebar />
      <main className="md:ml-64 min-h-screen p-6 md:p-8">{children}</main>
    </div>
  );
}
