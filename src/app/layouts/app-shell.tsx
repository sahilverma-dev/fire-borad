import { useAuth } from "@/components/providers/auth-context-provider";
import { PenLine } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { ThemeToggle } from "@/components/custom/theme-toggle";
import { UserMenu } from "@/components/custom/user-menu";
import { cn } from "@/lib/utils";

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-secondary text-secondary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  );
}

export function AppShell() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <PenLine className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Fireboard
            </span>
          </NavLink>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            <NavLink to="/" end className={navClass}>
              Drawings
            </NavLink>
            <NavLink to="/trash" className={navClass}>
              Trash
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user ? <UserMenu /> : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
