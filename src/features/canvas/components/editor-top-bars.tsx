import {
  Download,
  Keyboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  Undo2,
  Redo2,
} from "lucide-react";

import { ThemeToggle } from "@/components/custom/theme-toggle";
import { UserMenu } from "@/components/custom/user-menu";
import { SaveIndicator } from "@/components/shared/save-indicator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { cn } from "@/lib/utils";

interface EditorTopBarsProps {
  title: string;
  onTitleChange: (title: string) => void;
  onCommitTitle: () => void;
  onBack: () => void;
  onExport: () => void;
  onShowShortcuts: () => void;
  navigatorOpen: boolean;
  onToggleNavigator: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  onAddPage: () => void;
  onDuplicatePage: () => void;
  onDeletePage: () => void;
}

export function EditorTopBars({
  title,
  onTitleChange,
  onCommitTitle,
  onBack,
  onExport,
  onShowShortcuts,
  navigatorOpen,
  onToggleNavigator,
  inspectorOpen,
  onToggleInspector,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
}: EditorTopBarsProps) {
  const editor = useEditorStore((state) => state.editor);
  const status = useEditorStore((state) => state.status);
  const error = useEditorStore((state) => state.error);
  const scale = useEditorStore((state) => state.scale);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const showGrid = useEditorStore((state) => state.showGrid);
  const snapToGrid = useEditorStore((state) => state.snapToGrid);
  const snapToObjects = useEditorStore((state) => state.snapToObjects);
  const setShowGrid = useEditorStore((state) => state.setShowGrid);
  const setSnapToGrid = useEditorStore((state) => state.setSnapToGrid);
  const setSnapToObjects = useEditorStore((state) => state.setSnapToObjects);
  const canUndoRef = canUndo;
  const canRedoRef = canRedo;

  const run = (action: () => void) => {
    action();
    editor?.focus();
  };

  const zoom = (factor: number) => {
    if (!editor) return;
    const next = Math.min(10, Math.max(0.1, editor.getScale() * factor));
    editor.zoom(next);
  };

  return (
    <>
      <div className="pointer-events-none fixed left-3 top-3 z-30 flex max-w-[calc(100vw-1.5rem)] items-center gap-2">
        <div className="pointer-events-auto flex items-center rounded-lg border border-border bg-background/95 p-1 shadow-md backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={navigatorOpen ? "Hide navigator" : "Show navigator"}
            aria-label="Toggle navigator"
            onClick={onToggleNavigator}
          >
            {navigatorOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>

          <span className="mx-0.5 h-5 w-px bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Menu"
                aria-label="Menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                File
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={onBack}>
                Dashboard
                <DropdownMenuShortcut>Esc</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => void useEditorStore.getState().flush?.()}
              >
                Save now
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onExport}>
                Export image…
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Edit
              </DropdownMenuLabel>
              <DropdownMenuItem
                disabled={!canUndoRef}
                onSelect={() => run(() => editor?.actions.undo())}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Undo
                <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canRedoRef}
                onSelect={() => run(() => editor?.actions.redo())}
              >
                <Redo2 className="mr-2 h-4 w-4" />
                Redo
                <DropdownMenuShortcut>⇧⌘Z</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => run(() => editor?.actions.duplicate())}
              >
                Duplicate
                <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => run(() => editor?.actions.remove())}
              >
                Delete
                <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => run(() => editor?.selection.selectAll())}
              >
                Select all
                <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                View
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => zoom(1.2)}>
                Zoom in
                <DropdownMenuShortcut>⌘+</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => zoom(1 / 1.2)}>
                Zoom out
                <DropdownMenuShortcut>⌘−</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor?.zoom(1)}>
                Zoom to 100%
                <DropdownMenuShortcut>⌘0</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor?.fitToScreen(1, 1)}>
                Fit page
                <DropdownMenuShortcut>⌘9</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuCheckboxItem
                checked={showGrid}
                onCheckedChange={(checked) => {
                  editor?.setShowGrid(checked);
                  setShowGrid(checked);
                }}
              >
                Show grid
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={snapToGrid}
                onCheckedChange={(checked) => {
                  editor?.setSnapToGrid(checked);
                  setSnapToGrid(checked);
                }}
              >
                Snap to grid
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={snapToObjects}
                onCheckedChange={(checked) => {
                  editor?.setSnapToObjects(checked);
                  setSnapToObjects(checked);
                }}
              >
                Snap to objects
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Page
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={onAddPage}>Add page</DropdownMenuItem>
              <DropdownMenuItem onSelect={onDuplicatePage}>
                Duplicate page
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={onDeletePage}
              >
                Delete page
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onShowShortcuts}>
                <Keyboard className="mr-2 h-4 w-4" />
                Keyboard shortcuts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="mx-0.5 h-5 w-px bg-border" />

          <div className="hidden min-w-0 items-center gap-2 px-1 sm:flex">
            <input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              onBlur={onCommitTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  event.currentTarget.blur();
                }
              }}
              className="w-32 min-w-0 truncate rounded-sm bg-transparent px-1 py-0.5 text-xs font-semibold outline-none transition focus:bg-accent focus:ring-1 focus:ring-ring sm:w-48"
              aria-label="Drawing title"
            />
            <SaveIndicator
              status={status}
              error={error}
              onRetry={() => void useEditorStore.getState().flush?.()}
              className="hidden sm:flex"
            />
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed right-3 top-3 z-30 flex items-center gap-2">
        <div className="pointer-events-auto flex items-center rounded-lg border border-border bg-background/95 p-1 shadow-md backdrop-blur">
          <span className="hidden sm:block">
            <ThemeToggle />
          </span>

          <span className="mx-0.5 hidden h-5 w-px bg-border sm:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs tabular-nums"
                title="Zoom / view options"
              >
                {Math.round(scale * 100)}%
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => editor?.zoom(editor.getScale() * 1.2)}>
                Zoom in
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => editor?.zoom(editor.getScale() / 1.2)}
              >
                Zoom out
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor?.zoom(1)}>
                Zoom to 100%
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor?.fitToScreen(1, 1)}>
                Fit page
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="mx-0.5 h-5 w-px bg-border" />

          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 sm:inline-flex"
            title="Export image"
            aria-label="Export image"
            onClick={onExport}
          >
            <Download className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", !inspectorOpen && "text-muted-foreground")}
            title={inspectorOpen ? "Hide inspector" : "Show inspector"}
            aria-label="Toggle inspector"
            onClick={onToggleInspector}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>

          <span className="mx-0.5 h-5 w-px bg-border" />

          <UserMenu />
        </div>
      </div>
    </>
  );
}
