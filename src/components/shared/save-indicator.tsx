import { AlertCircle, Check, Cloud, Loader2 } from "lucide-react";

import type { SaveStatus } from "@/features/canvas/store/editor-store";
import { cn } from "@/lib/utils";

interface SaveIndicatorProps {
  status: SaveStatus;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function SaveIndicator({
  status,
  error,
  onRetry,
  className,
}: SaveIndicatorProps) {
  const content = (() => {
    switch (status) {
      case "saving":
        return (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving…
          </>
        );
      case "dirty":
        return (
          <>
            <Cloud className="h-3.5 w-3.5" />
            Unsaved changes
          </>
        );
      case "error":
        return (
          <>
            <AlertCircle className="h-3.5 w-3.5" />
            Save failed
          </>
        );
      case "saved":
        return (
          <>
            <Check className="h-3.5 w-3.5" />
            Saved
          </>
        );
      default:
        return null;
    }
  })();

  if (!content) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        status === "error"
          ? "text-destructive"
          : "text-muted-foreground",
        className
      )}
      title={error ?? undefined}
    >
      {content}
      {status === "error" && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 underline underline-offset-2 hover:text-foreground"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
