import { useEffect, useState } from "react";
import {
  Copy,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  useCreatePage,
  useDeletePage,
  useDuplicatePage,
  useRenamePage,
  useReorderPage,
} from "@/features/pages/hooks";
import { orderAtEnd, orderBetween } from "@/lib/firestore/fractional";
import { friendlyFirestoreError } from "@/lib/firebase/errors";
import { cn } from "@/lib/utils";
import type { Page } from "@/types/models";

interface PageStripProps {
  drawingId: string;
  uid: string;
  pages: Page[];
  currentPageId: string;
  onNavigate: (pageId: string) => void;
  onBeforeNavigate: () => Promise<void> | void;
}

export function PageStrip({
  drawingId,
  uid,
  pages,
  currentPageId,
  onNavigate,
  onBeforeNavigate,
}: PageStripProps) {
  const createPage = useCreatePage(drawingId);
  const duplicatePage = useDuplicatePage(drawingId);
  const deletePage = useDeletePage(drawingId);
  const renamePage = useRenamePage(drawingId);
  const reorderPage = useReorderPage(drawingId);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<Page | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<Page | null>(null);

  useEffect(() => {
    if (renaming) setRenameValue(renaming.name);
  }, [renaming]);

  const go = async (pageId: string) => {
    if (pageId === currentPageId) return;
    await onBeforeNavigate();
    onNavigate(pageId);
  };

  const handleAdd = async () => {
    try {
      const order = orderAtEnd(pages.map((page) => page.order));
      const pageId = await createPage.mutateAsync({
        uid,
        order,
        name: `Page ${pages.length + 1}`,
      });
      await go(pageId);
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  const handleDuplicate = async (page: Page) => {
    try {
      const index = pages.findIndex((item) => item.id === page.id);
      const next = pages[index + 1]?.order ?? null;
      const order = orderBetween(page.order, next);
      const pageId = await duplicatePage.mutateAsync({ page, uid, order });
      await go(pageId);
      toast.success("Page duplicated");
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    if (pages.length <= 1) {
      toast.error("A drawing needs at least one page");
      setDeleting(null);
      return;
    }
    const fallback =
      pages.find((page) => page.id !== deleting.id)?.id ?? null;
    try {
      await deletePage.mutateAsync({ page: deleting, nextPageId: fallback });
      const wasCurrent = deleting.id === currentPageId;
      setDeleting(null);
      toast.success("Page deleted");
      if (wasCurrent && fallback) {
        onNavigate(fallback);
      }
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  const handleRename = async () => {
    if (!renaming) return;
    try {
      await renamePage.mutateAsync({
        pageId: renaming.id,
        name: renameValue,
      });
      setRenaming(null);
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  const handleDrop = async (target: Page) => {
    if (!draggingId || draggingId === target.id) {
      setDraggingId(null);
      return;
    }

    const from = pages.findIndex((page) => page.id === draggingId);
    const to = pages.findIndex((page) => page.id === target.id);
    if (from < 0 || to < 0) {
      setDraggingId(null);
      return;
    }

    const next = [...pages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const index = next.findIndex((page) => page.id === draggingId);
    const order = orderBetween(
      next[index - 1]?.order ?? null,
      next[index + 1]?.order ?? null
    );

    setDraggingId(null);
    try {
      await reorderPage.mutateAsync({ pageId: draggingId, order });
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  return (
    <div className="flex h-[108px] shrink-0 items-center gap-3 border-t border-border bg-background px-3">
      <span className="hidden shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:block">
        Pages
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto py-2">
        {pages.map((page, index) => {
          const active = page.id === currentPageId;
          return (
            <div
              key={page.id}
              draggable
              onDragStart={() => setDraggingId(page.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleDrop(page)}
              onDragEnd={() => setDraggingId(null)}
              className={cn(
                "group relative w-[118px] shrink-0 rounded-lg border p-1 transition",
                active
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:bg-accent/60",
                draggingId === page.id && "opacity-50"
              )}
            >
              <button
                type="button"
                onClick={() => void go(page.id)}
                className="block w-full text-left"
                aria-label={`Open ${page.name}`}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md border border-border bg-white">
                  {page.thumbnailUrl ? (
                    <img
                      src={page.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_1px_1px,#e2e8f0_1px,transparent_0)] [background-size:12px_12px] text-[10px] text-muted-foreground">
                      {index + 1}
                    </div>
                  )}
                  <span className="absolute left-1 top-1 rounded bg-background/85 px-1 text-[9px] font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                </div>
                <p className="mt-1 truncate px-0.5 text-[11px] text-muted-foreground">
                  {page.name}
                </p>
              </button>

              <div className="absolute right-1 top-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-5 w-5 items-center justify-center rounded bg-background/85 text-muted-foreground opacity-0 shadow-sm transition hover:text-foreground focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                      aria-label={`Actions for ${page.name}`}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem onClick={() => setRenaming(page)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void handleDuplicate(page)}>
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      disabled={pages.length <= 1}
                      onClick={() => setDeleting(page)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={createPage.isPending}
          className="flex h-[74px] w-[74px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          {createPage.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add page
        </button>
      </div>

      <Dialog
        open={Boolean(renaming)}
        onOpenChange={(open) => {
          if (!open) setRenaming(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename page</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleRename();
            }}
            className="space-y-4"
          >
            <Input
              autoFocus
              value={renameValue}
              maxLength={80}
              onChange={(event) => setRenameValue(event.target.value)}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenaming(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={renamePage.isPending}>
                {renamePage.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this page?"
        description={
          deleting
            ? `“${deleting.name}” and everything on it will be permanently deleted.`
            : ""
        }
        confirmLabel="Delete page"
        destructive
        loading={deletePage.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
