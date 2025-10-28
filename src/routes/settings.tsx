import { Check, LogOut, Monitor, Moon, Sun } from "lucide-react";

import { RemoteImage } from "@/components/shared/remote-image";
import { useAuth } from "@/components/providers/auth-context-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and how Fireboard looks.
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Profile</h2>
        </div>
        <div className="flex items-center gap-4 px-5 py-5">
          <RemoteImage
            src={user?.photoURL}
            alt=""
            loading="eager"
            className="h-14 w-14 rounded-full border border-border bg-muted object-cover"
            fallback={
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted text-lg font-semibold">
                {(user?.displayName ?? "S").slice(0, 1).toUpperCase()}
              </div>
            }
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {user?.displayName ?? "Someone"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {user?.email}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your drawings and images are private to this account.
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Appearance</h2>
        </div>
        <div className="grid gap-3 px-5 py-5 sm:grid-cols-3">
          {themes.map((option) => {
            const Icon = option.icon;
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{option.label}</span>
                {active ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Account</h2>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-5">
          <div>
            <p className="text-sm">Sign out of Fireboard</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your work is saved to your account before you leave.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </section>

      <div className="flex items-center gap-3 pb-4 text-xs text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          F
        </span>
        <span>Fireboard · schema v1</span>
        <Separator orientation="vertical" className="h-4" />
        <span>{user?.uid.slice(0, 8)}</span>
      </div>
    </div>
  );
}
