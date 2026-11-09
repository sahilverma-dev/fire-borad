import {
  ArrowUpRight,
  Circle,
  Eraser,
  Frame,
  Hand,
  Highlighter,
  ImagePlus,
  Lock,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  Type,
  Unlock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { cn } from "@/lib/utils";

interface ToolDefinition {
  id: string;
  label: string;
  shortcut?: string;
  icon: typeof MousePointer2;
  kind?: "handler" | "default";
}

const TOOLS: ToolDefinition[] = [
  { id: "Select", label: "Select", shortcut: "V", icon: MousePointer2, kind: "default" },
  { id: "Hand", label: "Hand", shortcut: "H", icon: Hand },
  { id: "Eraser", label: "Eraser", shortcut: "E", icon: Eraser },
  { id: "Rectangle", label: "Rectangle", shortcut: "R", icon: Square },
  { id: "Ellipse", label: "Ellipse", shortcut: "O", icon: Circle },
  { id: "Text", label: "Text", shortcut: "T", icon: Type },
  { id: "Connector", label: "Connector", shortcut: "C", icon: ArrowUpRight },
  { id: "Line", label: "Line", shortcut: "L", icon: Minus },
  { id: "Freehand", label: "Freehand", shortcut: "P", icon: Pencil },
  { id: "Highlighter", label: "Highlighter", icon: Highlighter },
  { id: "Frame", label: "Frame", icon: Frame },
];

export function EditorToolbar({
  onRequestImage,
}: {
  onRequestImage: () => void;
}) {
  const editor = useEditorStore((state) => state.editor);
  const activeHandler = useEditorStore((state) => state.activeHandler);
  const lock = useEditorStore((state) => state.activeHandlerLock);

  const isDrawHandler =
    activeHandler !== "Select" &&
    activeHandler !== "Hand" &&
    activeHandler !== "Eraser" &&
    activeHandler !== "Image";

  const activate = (tool: ToolDefinition) => {
    if (!editor) return;
    if (tool.kind === "default") {
      editor.activateDefaultHandler();
      editor.selection.deselectAll();
    } else {
      editor.activateHandler(tool.id);
    }
    editor.focus();
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-2">
      <div className="pointer-events-auto relative flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-border bg-background/95 p-1 shadow-lg backdrop-blur thin-scrollbar">
        {isDrawHandler ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title={lock ? "Unlock tool" : "Keep tool active"}
            aria-label={lock ? "Unlock tool" : "Keep tool active"}
            onClick={() => editor?.setActiveHandlerLock(!lock)}
          >
            {lock ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Unlock className="h-3.5 w-3.5 opacity-50" />
            )}
          </Button>
        ) : null}

        {isDrawHandler ? (
          <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />
        ) : null}

        {TOOLS.slice(0, 6).map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            active={activeHandler === tool.id}
            onClick={() => activate(tool)}
          />
        ))}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="Image (I)"
          aria-label="Image"
          onClick={onRequestImage}
        >
          <ImagePlus className="h-4 w-4" />
        </Button>

        <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />

        {TOOLS.slice(6).map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            active={activeHandler === tool.id}
            onClick={() => activate(tool)}
          />
        ))}
      </div>
    </div>
  );
}

function ToolButton({
  tool,
  active,
  onClick,
}: {
  tool: ToolDefinition;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tool.icon;
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className={cn("h-8 w-8 shrink-0", active && "shadow-sm")}
      title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
      aria-label={tool.label}
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
