import {
  ArrowLeft,
  Keyboard,
  Loader2,
  Redo2,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/custom/theme-toggle";
import { UserMenu } from "@/components/custom/user-menu";
import { useAuth } from "@/components/providers/auth-context-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { SaveIndicator } from "@/components/shared/save-indicator";
import { Button } from "@/components/ui/button";
import { Canvas } from "@/features/canvas/components/canvas";
import { PropertiesPanel } from "@/features/canvas/components/properties-panel";
import { ShortcutsDialog } from "@/features/canvas/components/shortcuts-dialog";
import { ToolRail } from "@/features/canvas/components/tool-rail";
import { useAutosave } from "@/features/canvas/hooks/use-autosave";
import { useDrawingImages, useElements } from "@/features/canvas/hooks/use-elements";
import { defaultStyle } from "@/features/canvas/lib/defaults";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { useDrawing, useRenameDrawing } from "@/features/drawings/hooks";
import { uploadImage } from "@/features/images/api";
import { PageStrip } from "@/features/pages/components/page-strip";
import { usePage } from "@/features/pages/hooks";
import { usePageThumbnail } from "@/features/pages/hooks/use-page-thumbnail";
import { setLastPage } from "@/features/drawings/api";
import { usePages } from "@/features/pages/hooks";
import { queryKeys } from "@/lib/query-keys";
import { orderAtEnd } from "@/lib/firestore/fractional";
import { newId } from "@/lib/id";
import type { BoardElement, ImageAsset } from "@/types/models";
import { useQueryClient } from "@tanstack/react-query";

export default function EditorPage() {
  const { drawingId = "", pageId = "" } = useParams();
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const drawingQuery = useDrawing(drawingId);
  const pagesQuery = usePages(drawingId);
  const pageQuery = usePage(drawingId, pageId);
  const elementsQuery = useElements(drawingId, pageId);
  const imagesQuery = useDrawingImages(drawingId);
  const renameDrawing = useRenameDrawing();

  const storePage = useEditorStore((state) => state.page);
  const status = useEditorStore((state) => state.status);
  const error = useEditorStore((state) => state.error);
  const past = useEditorStore((state) => state.past);
  const future = useEditorStore((state) => state.future);
  const hydrate = useEditorStore((state) => state.hydrate);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  const [title, setTitle] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hydrated = useRef<string | null>(null);

  const ready = storePage?.id === pageId && elementsQuery.isSuccess;
  const { flush } = useAutosave(drawingId, pageId, ready);

  usePageThumbnail({
    drawingId,
    isFirstPage: pagesQuery.data?.[0]?.id === pageId,
    enabled: ready,
  });

  useEffect(() => {
    if (drawingQuery.data) {
      setTitle(drawingQuery.data.title);
    }
  }, [drawingQuery.data]);

  useEffect(() => {
    if (
      !pageQuery.data ||
      pageQuery.data.id !== pageId ||
      !elementsQuery.data
    ) {
      return;
    }
    if (hydrated.current === pageId) return;
    hydrate(pageQuery.data, elementsQuery.data);
    hydrated.current = pageId;
  }, [pageQuery.data, elementsQuery.data, pageId, hydrate]);

  useEffect(() => {
    if (!drawingId || !pageId) return;
    void setLastPage(drawingId, pageId);
  }, [drawingId, pageId]);

  useEffect(() => {
    document.title = drawingQuery.data
      ? `${drawingQuery.data.title} — Fireboard`
      : "Fireboard";
    return () => {
      document.title = "Fireboard";
    };
  }, [drawingQuery.data]);

  const imagesById = useMemo(() => {
    const map = new Map<string, ImageAsset>();
    for (const asset of imagesQuery.data ?? []) {
      map.set(asset.id, asset);
    }
    return map;
  }, [imagesQuery.data]);

  const commitTitle = () => {
    const trimmed = title.trim();
    const current = drawingQuery.data;
    if (!current || !trimmed || trimmed === current.title) return;
    renameDrawing.mutate({ drawingId, title: trimmed });
  };

  const handleFiles = useCallback(
    async (files: File[]) => {
      const targetPageId = useEditorStore.getState().page?.id;
      if (!targetPageId) return;

      for (const file of files) {
        const toastId = toast.loading(`Uploading ${file.name}…`);
        try {
          const { asset, deduped } = await uploadImage({
            uid,
            drawingId,
            file,
          });

          queryClient.setQueryData<ImageAsset[]>(
            queryKeys.images(drawingId),
            (existing) => {
              const list = existing ?? [];
              return list.some((item) => item.id === asset.id)
                ? list
                : [...list, asset];
            }
          );

          const state = useEditorStore.getState();
          if (state.page?.id !== targetPageId) {
            toast.success("Image uploaded", { id: toastId });
            continue;
          }

          const maxWidth = Math.min(560, state.page.width * 0.6);
          const scale = Math.min(1, maxWidth / asset.width);
          const width = Math.max(80, asset.width * scale);
          const height = Math.max(80, asset.height * scale);

          state.addElement({
            id: newId(),
            type: "image",
            x: state.page.width / 2 - width / 2,
            y: state.page.height / 2 - height / 2,
            w: width,
            h: height,
            order: orderAtEnd(
              Object.values(state.elements).map((element) => element.order)
            ),
            angle: 0,
            opacity: 1,
            style: defaultStyle,
            imageId: asset.id,
            naturalWidth: asset.width,
            naturalHeight: asset.height,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: uid,
          } as BoardElement);

          toast.success(deduped ? "Image reused" : "Image added", {
            id: toastId,
          });
        } catch (uploadError) {
          toast.error(
            uploadError instanceof Error
              ? uploadError.message
              : "Could not upload that image",
            { id: toastId }
          );
        }
      }
    },
    [drawingId, queryClient, uid]
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length) {
        event.preventDefault();
        void handleFiles(files);
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFiles]);

  const handleNavigate = async (target: string) => {
    await flush();
    navigate(`/d/${drawingId}/p/${target}`);
  };

  if (
    drawingQuery.isLoading ||
    pagesQuery.isLoading ||
    pageQuery.isLoading ||
    elementsQuery.isLoading
  ) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Opening drawing…
      </div>
    );
  }

  if (drawingQuery.data?.isDeleted) {
    return <Navigate to="/trash" replace />;
  }

  if (!drawingQuery.data || !pageQuery.data) {
    return (
      <div className="flex h-[100dvh] items-center justify-center px-6">
        <EmptyState
          icon={ArrowLeft}
          title="This drawing is not available"
          description="It may have been deleted, or the link is incorrect."
          action={
            <Button asChild>
              <Link to="/">Back to drawings</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const pages = pagesQuery.data ?? [];

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 sm:px-3">
        <Button variant="ghost" size="icon" asChild aria-label="Back to drawings">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setTitle(drawingQuery.data?.title ?? "");
              event.currentTarget.blur();
            }
          }}
          className="min-w-0 max-w-[16rem] flex-1 truncate rounded-md bg-transparent px-2 py-1 text-sm font-medium outline-none transition focus:bg-accent focus:ring-1 focus:ring-ring sm:max-w-xs"
          aria-label="Drawing title"
        />

        <SaveIndicator
          status={status}
          error={error}
          onRetry={() => void flush()}
          className="ml-1 hidden sm:flex"
        />

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            disabled={!past.length}
            onClick={undo}
            aria-label="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            disabled={!future.length}
            onClick={redo}
            aria-label="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            onClick={() => setShortcutsOpen(true)}
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {status === "error" && error ? (
        <div className="flex items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/5 px-4 py-1.5 text-xs text-destructive">
          <span>{error}</span>
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => void flush()}
          >
            Retry save
          </button>
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <ToolRail onRequestImage={() => fileInputRef.current?.click()} />
        <div className="relative min-w-0 flex-1">
          <Canvas
            uid={uid}
            page={pageQuery.data}
            imagesById={imagesById}
            onRequestImage={() => fileInputRef.current?.click()}
            onDropFiles={(files) => void handleFiles(files)}
          />
        </div>
        <PropertiesPanel />
      </div>

      <PageStrip
        drawingId={drawingId}
        uid={uid}
        pages={pages}
        currentPageId={pageId}
        onNavigate={(target) => void handleNavigate(target)}
        onBeforeNavigate={flush}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) void handleFiles(files);
          event.target.value = "";
        }}
      />

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
