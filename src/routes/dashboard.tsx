import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownUp,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-context-provider";
import { CreateDrawingDialog } from "@/features/drawings/components/create-drawing-dialog";
import { DrawingCard } from "@/features/drawings/components/drawing-card";
import { RenameDrawingDialog } from "@/features/drawings/components/rename-drawing-dialog";
import type { DrawingSort } from "@/features/drawings/api";
import {
  useDrawings,
  useDuplicateDrawing,
  useRestoreDrawing,
  useSoftDeleteDrawing,
} from "@/features/drawings/hooks";
import { friendlyFirestoreError } from "@/lib/firebase/errors";
import type { Drawing } from "@/types/models";

export default function DashboardPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<DrawingSort>("updated");
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<Drawing | null>(null);
  const [deleting, setDeleting] = useState<Drawing | null>(null);

  const drawings = useDrawings(uid, "active", sort);
  const softDelete = useSoftDeleteDrawing();
  const restore = useRestoreDrawing();
  const duplicate = useDuplicateDrawing();

  const sentinel = useRef<HTMLDivElement | null>(null);

  const items = useMemo(() => {
    const all = drawings.data?.pages.flatMap((page) => page.items) ?? [];
    const seen = new Set<string>();
    return all.filter((drawing) => {
      if (seen.has(drawing.id)) return false;
      seen.add(drawing.id);
      return true;
    });
  }, [drawings.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((drawing) =>
      drawing.title.toLowerCase().includes(term)
    );
  }, [items, search]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (
        entries[0]?.isIntersecting &&
        drawings.hasNextPage &&
        !drawings.isFetchingNextPage
      ) {
        void drawings.fetchNextPage();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [drawings]);

  const confirmDelete = async () => {
    if (!deleting) return;
    const drawing = deleting;
    try {
      await softDelete.mutateAsync(drawing.id);
      setDeleting(null);
      toast.success("Moved to trash", {
        action: {
          label: "Undo",
          onClick: () => {
            void restore.mutateAsync(drawing.id);
          },
        },
      });
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  const handleDuplicate = async (drawing: Drawing) => {
    try {
      const result = await duplicate.mutateAsync({ drawing, uid });
      toast.success("Drawing duplicated", {
        action: {
          label: "Open copy",
          onClick: () => {
            navigate(`/d/${result.drawingId}/p/${result.pageId}`);
          },
        },
      });
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Drawings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length > 0
              ? `${items.length}${drawings.hasNextPage ? "+" : ""} drawing${
                  items.length === 1 ? "" : "s"
                } in your account`
              : "Your ideas, pages and sketches live here."}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New drawing
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search drawings…"
            className="pl-9"
            aria-label="Search drawings"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as DrawingSort)}
              className="h-10 appearance-none rounded-md border border-input bg-background pl-9 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Sort drawings"
            >
              <option value="updated">Last updated</option>
              <option value="created">Newest first</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
      </div>

      {drawings.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-xl border">
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : drawings.isError ? (
        <ErrorState
          message={friendlyFirestoreError(drawings.error)}
          onRetry={() => void drawings.refetch()}
        />
      ) : filtered.length === 0 ? (
        search ? (
          <EmptyState
            icon={Search}
            title="No drawings match your search"
            description={`Nothing found for “${search}”. Try a different name.`}
            action={
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Start your first drawing"
            description="Create a drawing, add pages, and sketch whatever is on your mind."
            action={
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New drawing
              </Button>
            }
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((drawing) => (
            <DrawingCard
              key={drawing.id}
              drawing={drawing}
              onRename={setRenaming}
              onDelete={setDeleting}
              onDuplicate={(item) => void handleDuplicate(item)}
            />
          ))}
        </div>
      )}

      <div ref={sentinel} className="flex justify-center py-2">
        {drawings.isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more drawings…
          </div>
        ) : drawings.hasNextPage ? (
          <Button
            variant="outline"
            onClick={() => void drawings.fetchNextPage()}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Load more
          </Button>
        ) : null}
      </div>

      <CreateDrawingDialog
        uid={uid}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <RenameDrawingDialog
        drawing={renaming}
        open={Boolean(renaming)}
        onOpenChange={(open) => {
          if (!open) setRenaming(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Move drawing to trash?"
        description={
          deleting
            ? `“${deleting.title}” will be moved to trash. You can restore it later.`
            : ""
        }
        confirmLabel="Move to trash"
        destructive
        loading={softDelete.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
