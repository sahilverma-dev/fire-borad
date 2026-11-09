import { Loader2, PenLine } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { ThemeToggle } from "@/components/custom/theme-toggle";
import { useAuth } from "@/components/providers/auth-context-provider";
import { Button } from "@/components/ui/button";
import { firebaseConfigured } from "@/firebase/config";

export default function LoginPage() {
  const { login, signingIn, error } = useAuth();

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <PenLine className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Fireboard</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/95 p-7 shadow-xl backdrop-blur sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background shadow-sm">
              <PenLine className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Sign in to Fireboard
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              One account, one click. Your drawings stay private.
            </p>
          </div>

          {!firebaseConfigured ? (
            <p className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Firebase is not configured. Add your VITE_* keys to a local
              <code className="mx-1 rounded bg-black/10 px-1 py-0.5 dark:bg-white/10">
                .env
              </code>
              file.
            </p>
          ) : null}

          <Button
            className="h-11 w-full gap-2.5 text-sm"
            onClick={() => void login()}
            disabled={signingIn || !firebaseConfigured}
          >
            {signingIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FcGoogle className="h-5 w-5" />
            )}
            Continue with Google
          </Button>

          {error ? (
            <p className="mt-3 text-center text-sm text-destructive">{error}</p>
          ) : null}

          <p className="mt-7 text-center text-[11px] leading-relaxed text-muted-foreground">
            By continuing you agree to keep your boards kind, your pages tidy,
            and your images reasonably sized.
          </p>
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-6 text-center text-[11px] text-muted-foreground">
        Fireboard · drawings, pages and images that stay in sync
      </footer>
    </div>
  );
}
