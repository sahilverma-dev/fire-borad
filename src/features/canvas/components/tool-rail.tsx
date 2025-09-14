import {
  ArrowUpRight,
  Circle,
  Eraser,
  Hand,
  ImagePlus,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import type { Tool } from "@/types/models";
import { cn } from "@/lib/utils";

const tools: {
  id: Tool;
  icon: LucideIcon;
  label: string;
  shortcut: string;
}[] = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { id: "hand", icon: Hand, label: "Pan", shortcut: "H" },
  { id: "rect", icon: Square, label: "Rectangle", shortcut: "R" },
  { id: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
  { id: "arrow", icon: ArrowUpRight, label: "Arrow", shortcut: "A" },
  { id: "line", icon: Minus, label: "Line", shortcut: "L" },
  { id: "text", icon: Type, label: "Text", shortcut: "T" },
  { id: "pen", icon: Pencil, label: "Freehand", shortcut: "P" },
  { id: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
];

export function ToolRail({ onRequestImage }: { onRequestImage: () => void }) {
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);

  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-background py-3">
      {tools.map((entry) => {
        const Icon = entry.icon;
        const active = tool === entry.id;
        return (
          <Button
            key={entry.id}
            variant={active ? "default" : "ghost"}
            size="icon"
            className={cn("h-9 w-9", !active && "text-muted-foreground")}
            title={`${entry.label} (${entry.shortcut})`}
            aria-label={entry.label}
            aria-pressed={active}
            onClick={() => setTool(entry.id)}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}

      <div className="my-1 h-px w-7 bg-border" />

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground"
        title="Insert image (I)"
        aria-label="Insert image"
        onClick={onRequestImage}
      >
        <ImagePlus className="h-4 w-4" />
      </Button>
    </div>
  );
}
