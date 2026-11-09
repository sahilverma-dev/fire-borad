import {
  ArrowDown,
  ArrowUp,
  Circle,
  Copy,
  Eye,
  EyeOff,
  Frame,
  Highlighter,
  ImagePlus,
  Layers,
  Lock,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Scan,
  Square,
  Type,
  Unlock,
  ArrowUpRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { shapeLabel } from "@/features/canvas/lib/dgm";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { orderBetween } from "@/lib/firestore/fractional";
import { cn } from "@/lib/utils";
import type { Page } from "@/types/models";
import type { Shape } from "@dgmjs/core";

interface NavigatorPanelProps {
  open: boolean;
  pages: Page[];
  currentPageId: string;
  onNavigate: (pageId: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (page: Page) => void;
  onRequestDeletePage: (page: Page) => void;
  onRenamePage: (pageId: string, name: string) => Promise<void>;
  onReorderPage: (pageId: string, order: string) => Promise<void>;
}

export function NavigatorPanel({
  open,
  pages,
  currentPageId,
  onNavigate,
  onAddPage,
  onDuplicatePage,
  onRequestDeletePage,
  onRenamePage,
  onReorderPage,
}: NavigatorPanelProps) {
  const [tab, setTab] = useState<"pages" | "layers">("pages");
  const [renaming, setRenaming] = useState<Page | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (renaming) setRenameValue(renaming.name);
  }, [renaming]);

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
    await onReorderPage(draggingId, order);
  };

  return (
    <>
      <aside
        className={cn(
          "fixed bottom-3 left-3 top-[70px] z-20 flex w-56 flex-col overflow-hidden rounded-xl border border-border bg-background/95 shadow-md backdrop-blur transition-transform duration-200 ease-linear",
          open ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"
        )}
      >
        <div className="flex h-11 shrink-0 items-center justify-between border-b px-2">
          <div className="flex flex-1 items-center gap-1">
            <TabButton
              active={tab === "pages"}
              onClick={() => setTab("pages")}
            >
              Pages
            </TabButton>
            <TabButton
              active={tab === "layers"}
              onClick={() => setTab("layers")}
            >
              Layers
            </TabButton>
          </div>
          {tab === "pages" ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Add page"
              aria-label="Add page"
              onClick={onAddPage}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        {tab === "pages" ? (
          <div className="thin-scrollbar flex-1 overflow-y-auto p-2">
            <div className="flex flex-col gap-1.5">
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
                      "group relative flex items-center gap-2 rounded-lg border p-1.5 transition",
                      active
                        ? "border-primary/40 bg-primary/5"
                        : "border-transparent hover:bg-accent/60",
                      draggingId === page.id && "opacity-50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onNavigate(page.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      aria-label={`Open ${page.name}`}
                    >
                      <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded border border-border bg-white">
                        {page.thumbnailUrl ? (
                          <img
                            src={page.thumbnailUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_1px_1px,#e2e8f0_1px,transparent_0)] [background-size:10px_10px] text-[10px] text-muted-foreground">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{page.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Page {index + 1}
                        </p>
                      </div>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-background hover:text-foreground focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                          aria-label={`Actions for ${page.name}`}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setRenaming(page)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicatePage(page)}>
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={pages.length <= 1}
                          onClick={() => onRequestDeletePage(page)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={onAddPage}
                className="mt-1 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Add page
              </button>
            </div>
          </div>
        ) : (
          <LayersList />
        )}
      </aside>

      <Dialog
        open={Boolean(renaming)}
        onOpenChange={(next) => {
          if (!next) setRenaming(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename page</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!renaming) return;
              await onRenamePage(renaming.id, renameValue);
              setRenaming(null);
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
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold transition",
        active
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

interface LayerEntry {
  shape: Shape;
  depth: number;
}

function flattenLayers(shapes: Shape[], depth = 0, out: LayerEntry[] = []) {
  for (const shape of [...shapes].reverse()) {
    out.push({ shape, depth });
    const children = (shape.children ?? []) as Shape[];
    if (children.length) flattenLayers(children, depth + 1, out);
  }
  return out;
}

function layerIcon(shape: Shape) {
  switch (shape.type) {
    case "Text":
      return Type;
    case "Rectangle":
      return Square;
    case "Ellipse":
      return Circle;
    case "Line":
      return Minus;
    case "Connector":
      return ArrowUpRight;
    case "Freehand":
      return Pencil;
    case "Highlighter":
      return Highlighter;
    case "Image":
      return ImagePlus;
    case "Frame":
      return Frame;
    case "Group":
      return Layers;
    case "Embed":
      return Scan;
    default:
      return Square;
  }
}

function LayersList() {
  const editor = useEditorStore((state) => state.editor);
  const revision = useEditorStore((state) => state.revision);
  const selection = useEditorStore((state) => state.selection);

  const entries = useMemo(() => {
    void revision;
    void selection;
    const page = editor?.getCurrentPage();
    if (!page) return [];
    return flattenLayers(page.children as Shape[]);
  }, [editor, revision, selection]);

  if (!editor || entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted-foreground">
        No layers yet. Draw something on the page.
      </div>
    );
  }

  const selectedIds = new Set(selection.map((shape) => shape.id));

  return (
    <div className="thin-scrollbar flex-1 overflow-y-auto p-2">
      <div className="flex flex-col gap-0.5">
        {entries.map(({ shape, depth }) => {
          const Icon = layerIcon(shape);
          const selected = selectedIds.has(shape.id);
          return (
            <div
              key={shape.id}
              className={cn(
                "group flex h-8 items-center gap-1 rounded-md pr-1 transition",
                selected ? "bg-primary/10 text-foreground" : "hover:bg-accent/60"
              )}
              style={{ paddingLeft: 6 + depth * 12 }}
            >
              <button
                type="button"
                onClick={() => {
                  editor.selection.select([shape]);
                  editor.repaint();
                }}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                title={shapeLabel(shape)}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-[11px]">{shapeLabel(shape)}</span>
              </button>

              <button
                type="button"
                className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
                title={shape.visible ? "Hide" : "Show"}
                aria-label={shape.visible ? "Hide layer" : "Show layer"}
                onClick={() => {
                  editor.actions.update({ visible: !shape.visible }, [shape]);
                  editor.repaint();
                }}
              >
                {shape.visible ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
              </button>

              <button
                type="button"
                className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
                title={shape.enable ? "Lock" : "Unlock"}
                aria-label={shape.enable ? "Lock layer" : "Unlock layer"}
                onClick={() => {
                  editor.actions.update({ enable: !shape.enable }, [shape]);
                  editor.repaint();
                }}
              >
                {shape.enable ? (
                  <Unlock className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
              </button>

              {depth === 0 ? (
                <div className="flex items-center opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                    title="Bring forward"
                    aria-label="Bring forward"
                    onClick={() => {
                      editor.actions.bringForward([shape]);
                      editor.repaint();
                    }}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                    title="Send backward"
                    aria-label="Send backward"
                    onClick={() => {
                      editor.actions.sendBackward([shape]);
                      editor.repaint();
                    }}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
