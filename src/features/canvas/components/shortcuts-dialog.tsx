import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const shortcuts = [
  ["V", "Select tool"],
  ["H / Space drag", "Pan the canvas"],
  ["R", "Rectangle"],
  ["O", "Ellipse"],
  ["A", "Arrow"],
  ["L", "Line"],
  ["T", "Text"],
  ["P", "Freehand"],
  ["I", "Insert image"],
  ["E", "Eraser"],
  ["⌘ / Ctrl + Z", "Undo"],
  ["⇧ + ⌘ / Ctrl + Z", "Redo"],
  ["⌘ / Ctrl + D", "Duplicate selection"],
  ["Delete", "Delete selection"],
  ["⌘ / Ctrl + scroll", "Zoom"],
  ["↩ / double-click", "Edit text"],
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Everything you need to move faster on the canvas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          {shortcuts.map(([keys, label]) => (
            <div
              key={keys}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm odd:bg-muted/50"
            >
              <span className="text-muted-foreground">{label}</span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px]">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
