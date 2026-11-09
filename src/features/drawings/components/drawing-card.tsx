import {
  Copy,
  FileStack,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RemoteImage } from "@/components/shared/remote-image";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import type { Drawing } from "@/types/models";

interface DrawingCardProps {
  drawing: Drawing;
  onRename: (drawing: Drawing) => void;
  onDelete: (drawing: Drawing) => void;
  onDuplicate: (drawing: Drawing) => void;
}

export function DrawingCard({
  drawing,
  onRename,
  onDelete,
  onDuplicate,
}: DrawingCardProps) {
  const navigate = useNavigate();

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => navigate(`/d/${drawing.id}`)}
        className="block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={`Open ${drawing.title}`}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border bg-muted">
          <RemoteImage
            src={drawing.coverThumbUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            fallback={
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border))_1px,transparent_0)] [background-size:18px_18px] text-muted-foreground">
                <FileStack className="h-6 w-6" />
                <span className="text-xs font-medium">
                  {drawing.pageCount}{" "}
                  {drawing.pageCount === 1 ? "page" : "pages"}
                </span>
              </div>
            }
          />
        </div>

        <div className="flex items-center gap-2 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium">{drawing.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {drawing.pageCount} {drawing.pageCount === 1 ? "page" : "pages"} ·{" "}
              {timeAgo(drawing.updatedAt)}
            </p>
          </div>
        </div>
      </button>

      <div className="absolute right-2 top-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition hover:text-foreground focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
              )}
              aria-label={`Actions for ${drawing.title}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRename(drawing)}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(drawing)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(drawing)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
