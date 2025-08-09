import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRenameDrawing } from "@/features/drawings/hooks";
import { friendlyFirestoreError } from "@/lib/firebase/errors";
import type { Drawing } from "@/types/models";

interface RenameDrawingDialogProps {
  drawing: Drawing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameDrawingDialog({
  drawing,
  open,
  onOpenChange,
}: RenameDrawingDialogProps) {
  const [title, setTitle] = useState("");
  const renameDrawing = useRenameDrawing();

  useEffect(() => {
    if (drawing) setTitle(drawing.title);
  }, [drawing]);

  const submit = async () => {
    if (!drawing) return;
    try {
      await renameDrawing.mutateAsync({ drawingId: drawing.id, title });
      toast.success("Drawing renamed");
      onOpenChange(false);
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename drawing</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="rename-title">Title</Label>
            <Input
              id="rename-title"
              autoFocus
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={renameDrawing.isPending}>
              {renameDrawing.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
