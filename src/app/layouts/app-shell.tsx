import { LayoutGrid, Menu, PenLine, Settings, Trash2, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { ThemeToggle } from "@/components/custom/theme-toggle";
import { UserMenu } from "@/components/custom/user-menu";
import { useAuth } from "@/components/providers/auth-context-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-secondary text-secondary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  );
}

export function AppShell() {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const title =
    location.pathname === "/trash"
      ? "Trash"
      : location.pathname === "/settings"
        ? "Settings"
        : "Dashboard";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {drawerOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-border bg-background transition-transform duration-200 lg:static lg:translate-x-0",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <NavLink
            to="/"
            className="flex items-center gap-2.5"
            onClick={() => setDrawerOpen(false)}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <PenLine className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Fireboard
            </span>
          </NavLink>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="thin-scrollbar flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
          <nav className="flex flex-col gap-1">
            <NavLink
              to="/"
              end
              className={navClass}
              onClick={() => setDrawerOpen(false)}
            >
              <LayoutGrid className="h-4 w-4" />
              Drawings
            </NavLink>
            <NavLink
              to="/trash"
              className={navClass}
              onClick={() => setDrawerOpen(false)}
            >
              <Trash2 className="h-4 w-4" />
              Trash
            </NavLink>
            <NavLink
              to="/settings"
              className={navClass}
              onClick={() => setDrawerOpen(false)}
            >
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>
          </nav>
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 rounded-lg px-1 py-1">
            <UserMenu />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {user?.displayName ?? "Someone"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email ?? ""}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <p className="text-xs font-semibold text-muted-foreground">
            {title}
          </p>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        <main className="thin-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
