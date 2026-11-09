import { getImageBlob, getSVGImageData } from "@dgmjs/export";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEditorStore } from "@/features/canvas/store/editor-store";

type Format = "png" | "jpeg" | "webp" | "svg";

const FORMATS: { value: Format; label: string; mime: string }[] = [
  { value: "png", label: "PNG", mime: "image/png" },
  { value: "jpeg", label: "JPEG", mime: "image/jpeg" },
  { value: "webp", label: "WebP", mime: "image/webp" },
  { value: "svg", label: "SVG", mime: "image/svg+xml" },
];

export function ExportDialog({
  open,
  onOpenChange,
  fileName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
}) {
  const [format, setFormat] = useState<Format>("png");
  const [scale, setScale] = useState(2);
  const [background, setBackground] = useState(true);
  const [selectionOnly, setSelectionOnly] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    const editor = useEditorStore.getState().editor;
    const page = editor?.getCurrentPage();
    if (!editor || !page) return;

    const selection = useEditorStore.getState().selection;
    const shapes = selectionOnly ? selection : [];
    if (selectionOnly && shapes.length === 0) {
      toast.error("Select something to export first");
      return;
    }

    const option = FORMATS.find((item) => item.value === format)!;
    const safeName = (fileName || "drawing")
      .trim()
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setBusy(true);
    try {
      let blob: Blob | null = null;
      if (format === "svg") {
        const svg = await getSVGImageData(editor.canvas, page, shapes, {
          scale,
          dark: false,
          fillBackground: background,
          margin: 16,
        });
        blob = new Blob([svg], { type: "image/svg+xml" });
      } else {
        blob = await getImageBlob(editor.canvas, page, shapes, {
          format: option.mime as "image/png" | "image/jpeg" | "image/webp",
          scale,
          dark: false,
          fillBackground: background,
          margin: 16,
        });
      }

      if (!blob) {
        toast.error("Could not render that export");
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${safeName || "drawing"}.${format}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Image exported");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not export image"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export image</DialogTitle>
          <DialogDescription>
            Export the current page or the selected shapes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="flex items-center justify-between text-sm">
            <span>Format</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as Format)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              {FORMATS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center justify-between text-sm">
            <span>Scale</span>
            <Input
              type="number"
              min={1}
              max={4}
              step={0.5}
              value={scale}
              onChange={(event) =>
                setScale(Math.min(4, Math.max(1, Number(event.target.value) || 1)))
              }
              className="h-8 w-20 text-right"
            />
          </label>

          <label className="flex items-center justify-between text-sm">
            <span>Background</span>
            <input
              type="checkbox"
              checked={background}
              onChange={(event) => setBackground(event.target.checked)}
              className="accent-primary"
            />
          </label>

          <label className="flex items-center justify-between text-sm">
            <span>Selection only</span>
            <input
              type="checkbox"
              checked={selectionOnly}
              onChange={(event) => setSelectionOnly(event.target.checked)}
              className="accent-primary"
            />
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={busy}
            onClick={() => void handleExport()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
