import { ArrowRight, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { ThemeToggle } from "@/components/custom/theme-toggle";
import { useAuth } from "@/components/providers/auth-context-provider";
import { Button } from "@/components/ui/button";
import { firebaseConfigured } from "@/firebase/config";

export default function LoginPage() {
  const { login, signingIn, error } = useAuth();

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-slate-950 text-slate-100 lg:flex lg:flex-col">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.7) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-2.5 px-12 pt-12">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-950">
            <PenLine className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold tracking-tight">Fireboard</span>
        </div>

        <div className="relative z-10 max-w-lg px-12 pb-12 pt-20">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-300">
            <Sparkles className="h-3.5 w-3.5" />
            Drawings, pages and images that stay in sync
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            A calm place for every idea you sketch.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            Create as many drawings as you need, split them into pages, and drop
            images straight onto the canvas. Everything is saved to your account
            automatically.
          </p>

          <div className="mt-10 grid gap-3 text-sm">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Private to your Google account
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <ArrowRight className="h-4 w-4 text-sky-400" />
              Pick up where you left off on any device
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto px-12 pb-10 text-xs text-slate-500">
          Built with React, Firebase and a lot of tiny squares.
        </div>
      </aside>

      <section className="flex flex-col bg-background">
        <div className="flex items-center justify-between px-6 py-6 sm:px-10">
          <div className="flex items-center gap-2 lg:invisible">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PenLine className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">Fireboard</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-semibold tracking-tight">
              Sign in to your board
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Use your Google account. No password to remember.
            </p>

            {!firebaseConfigured ? (
              <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                Firebase is not configured. Add your VITE_* keys to a local
                <code className="mx-1 rounded bg-black/10 px-1 py-0.5 dark:bg-white/10">.env</code>
                file.
              </p>
            ) : null}

            <Button
              className="mt-6 h-11 w-full gap-2.5"
              onClick={() => void login()}
              disabled={signingIn || !firebaseConfigured}
            >
              {signingIn ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <FcGoogle className="h-5 w-5" />
              )}
              Continue with Google
            </Button>

            {error ? (
              <p className="mt-3 text-center text-sm text-destructive">{error}</p>
            ) : null}

            <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
              By signing in you agree to keep your drawings kind, your pages
              tidy, and your images reasonably sized.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
