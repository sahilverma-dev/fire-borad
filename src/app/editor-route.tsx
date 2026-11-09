import { Suspense, lazy } from "react";

const EditorPage = lazy(() => import("@/routes/editor"));

export function EditorRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
          Loading editor…
        </div>
      }
    >
      <EditorPage />
    </Suspense>
  );
}
