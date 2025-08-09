import { useMemo, useState } from "react";
import { Loader2, RotateCcw, Trash2, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-context-provider";
import {
  useDeleteDrawingForever,
  useDrawings,
  useRestoreDrawing,
} from "@/features/drawings/hooks";
import { friendlyFirestoreError } from "@/lib/firebase/errors";
import { timeAgo } from "@/lib/time";
import type { Drawing } from "@/types/models";

export default function TrashPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const drawings = useDrawings(uid, "trash", "updated");
  const restore = useRestoreDrawing();
  const deleteForever = useDeleteDrawingForever();

  const [deleting, setDeleting] = useState<Drawing | null>(null);
  const [emptying, setEmptying] = useState(false);
  const [emptyOpen, setEmptyOpen] = useState(false);

  const items = useMemo(() => {
    const all = drawings.data?.pages.flatMap((page) => page.items) ?? [];
    const seen = new Set<string>();
    return all.filter((drawing) => {
      if (seen.has(drawing.id)) return false;
      seen.add(drawing.id);
      return true;
    });
  }, [drawings.data]);

  const handleRestore = async (drawing: Drawing) => {
    try {
      await restore.mutateAsync(drawing.id);
      toast.success(`Restored “${drawing.title}”`);
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteForever.mutateAsync(deleting);
      toast.success("Drawing deleted permanently");
      setDeleting(null);
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  const handleEmpty = async () => {
    setEmptying(true);
    try {
      for (const drawing of items) {
        await deleteForever.mutateAsync(drawing);
      }
      toast.success("Trash emptied");
      setEmptyOpen(false);
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    } finally {
      setEmptying(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drawings stay here until you delete them permanently.
          </p>
        </div>
        {items.length > 0 ? (
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={() => setEmptyOpen(true)}
            disabled={emptying}
          >
            {emptying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TrashIcon className="h-4 w-4" />
            )}
            Empty trash
          </Button>
        ) : null}
      </div>

      {drawings.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : drawings.isError ? (
        <ErrorState onRetry={() => void drawings.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Trash is empty"
          description="Drawings you move to trash will appear here."
        />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
          {items.map((drawing) => (
            <div
              key={drawing.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-medium">
                    {drawing.title}
                  </h3>
                  <Badge variant="danger">Deleted</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {drawing.pageCount}{" "}
                  {drawing.pageCount === 1 ? "page" : "pages"} · deleted{" "}
                  {timeAgo(drawing.deletedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void handleRestore(drawing)}
                  disabled={restore.isPending}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setDeleting(drawing)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete forever
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {drawings.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void drawings.fetchNextPage()}
            disabled={drawings.isFetchingNextPage}
          >
            {drawings.isFetchingNextPage ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Load more
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete forever?"
        description={
          deleting
            ? `“${deleting.title}” and all of its pages, elements and images will be removed permanently. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete forever"
        destructive
        loading={deleteForever.isPending}
        onConfirm={() => void handleDelete()}
      />

      <ConfirmDialog
        open={emptyOpen}
        onOpenChange={setEmptyOpen}
        title="Empty the trash?"
        description="Every drawing in the trash will be deleted permanently, including their pages and images."
        confirmLabel="Empty trash"
        destructive
        loading={emptying}
        onConfirm={() => void handleEmpty()}
      />
    </div>
  );
}
