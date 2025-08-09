import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { useCreateDrawing } from "@/features/drawings/hooks";
import { friendlyFirestoreError } from "@/lib/firebase/errors";

interface CreateDrawingDialogProps {
  uid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDrawingDialog({
  uid,
  open,
  onOpenChange,
}: CreateDrawingDialogProps) {
  const [title, setTitle] = useState("");
  const createDrawing = useCreateDrawing();
  const navigate = useNavigate();

  const submit = async () => {
    try {
      const result = await createDrawing.mutateAsync({ uid, title });
      toast.success("Drawing created");
      onOpenChange(false);
      setTitle("");
      navigate(`/d/${result.drawingId}/p/${result.pageId}`);
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New drawing</DialogTitle>
          <DialogDescription>
            Give it a name. You can add more pages inside the editor.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="drawing-title">Title</Label>
            <Input
              id="drawing-title"
              autoFocus
              placeholder="Untitled drawing"
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
              disabled={createDrawing.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createDrawing.isPending}>
              {createDrawing.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create drawing
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
