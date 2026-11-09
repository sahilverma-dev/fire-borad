import { Image as DGMImage, Sizable } from "@dgmjs/core";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-context-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { DgmCanvas } from "@/features/canvas/components/dgm-canvas";
import { EditorToolbar } from "@/features/canvas/components/editor-toolbar";
import { EditorTopBars } from "@/features/canvas/components/editor-top-bars";
import { ExportDialog } from "@/features/canvas/components/export-dialog";
import { InspectorPanel } from "@/features/canvas/components/inspector-panel";
import { NavigatorPanel } from "@/features/canvas/components/navigator-panel";
import { ShortcutsDialog } from "@/features/canvas/components/shortcuts-dialog";
import {
  useDrawingImages,
  usePageShapes,
} from "@/features/canvas/hooks/use-elements";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { setLastPage } from "@/features/drawings/api";
import { useDrawing, useRenameDrawing } from "@/features/drawings/hooks";
import { uploadImage } from "@/features/images/api";
import {
  useCreatePage,
  useDeletePage,
  useDuplicatePage,
  usePage,
  usePages,
  useRenamePage,
  useReorderPage,
  useUpdatePageSettings,
} from "@/features/pages/hooks";
import { friendlyFirestoreError } from "@/lib/firebase/errors";
import { orderAtEnd, orderBetween } from "@/lib/firestore/fractional";
import { queryKeys } from "@/lib/query-keys";
import type { ImageAsset, Page } from "@/types/models";

function initialPanelState() {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= 1024;
}

export default function EditorPage() {
  const { drawingId = "", pageId = "" } = useParams();
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const drawingQuery = useDrawing(drawingId);
  const pagesQuery = usePages(drawingId);
  const pageQuery = usePage(drawingId, pageId);
  const shapesQuery = usePageShapes(drawingId, pageId);
  const imagesQuery = useDrawingImages(drawingId);

  const renameDrawing = useRenameDrawing();
  const createPage = useCreatePage(drawingId);
  const duplicatePage = useDuplicatePage(drawingId);
  const deletePage = useDeletePage(drawingId);
  const renamePage = useRenamePage(drawingId);
  const reorderPage = useReorderPage(drawingId);
  const updatePageSettings = useUpdatePageSettings(drawingId, pageId);

  const [title, setTitle] = useState("");
  const [navigatorOpen, setNavigatorOpen] = useState(initialPanelState);
  const [inspectorOpen, setInspectorOpen] = useState(initialPanelState);
  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [deletingPage, setDeletingPage] = useState<Page | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (drawingQuery.data) setTitle(drawingQuery.data.title);
  }, [drawingQuery.data]);

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

  const flush = useCallback(async () => {
    await useEditorStore.getState().flush?.();
  }, []);

  const handleNavigate = useCallback(
    async (target: string) => {
      await flush();
      navigate(`/d/${drawingId}/p/${target}`);
    },
    [drawingId, flush, navigate]
  );

  const commitTitle = () => {
    const trimmed = title.trim();
    const current = drawingQuery.data;
    if (!current || !trimmed || trimmed === current.title) return;
    renameDrawing.mutate({ drawingId, title: trimmed });
  };

  const pages = pagesQuery.data ?? [];
  const page = pageQuery.data;

  const handleAddPage = async () => {
    if (!page) return;
    try {
      const order = orderAtEnd(pages.map((item) => item.order));
      const nextPageId = await createPage.mutateAsync({
        uid,
        order,
        name: `Page ${pages.length + 1}`,
      });
      await handleNavigate(nextPageId);
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  const handleDuplicatePage = async (source: Page) => {
    try {
      await flush();
      const index = pages.findIndex((item) => item.id === source.id);
      const nextOrder = pages[index + 1]?.order ?? null;
      const order = orderBetween(source.order, nextOrder);
      const nextPageId = await duplicatePage.mutateAsync({
        page: source,
        uid,
        order,
      });
      await handleNavigate(nextPageId);
      toast.success("Page duplicated");
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  const handleDeletePage = async () => {
    if (!deletingPage) return;
    if (pages.length <= 1) {
      toast.error("A drawing needs at least one page");
      setDeletingPage(null);
      return;
    }

    await flush();
    const target = deletingPage;
    const fallback = pages.find((item) => item.id !== target.id)?.id ?? null;
    try {
      await deletePage.mutateAsync({ page: target, nextPageId: fallback });
      setDeletingPage(null);
      toast.success("Page deleted");
      if (target.id === pageId && fallback) {
        await handleNavigate(fallback);
      }
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  const handleRenamePage = async (targetPageId: string, name: string) => {
    try {
      await renamePage.mutateAsync({ pageId: targetPageId, name });
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  const handleReorderPage = async (targetPageId: string, order: string) => {
    try {
      await reorderPage.mutateAsync({ pageId: targetPageId, order });
    } catch (error) {
      toast.error(friendlyFirestoreError(error));
    }
  };

  const handleUpdatePage = (patch: {
    name?: string;
    width?: number;
    height?: number;
    background?: Page["background"];
  }) => {
    updatePageSettings.mutate(patch, {
      onError: (error) => toast.error(friendlyFirestoreError(error)),
    });
  };

  const insertImageAsset = useCallback(
    (asset: ImageAsset) => {
      const editor = useEditorStore.getState().editor;
      const dgmPage = editor?.getCurrentPage();
      const currentPage = pageQuery.data;
      if (!editor || !dgmPage || !currentPage) return;

      const maxWidth = Math.min(560, currentPage.width * 0.6);
      const scale = Math.min(1, maxWidth / Math.max(asset.width, 1));
      const width = Math.max(80, asset.width * scale);
      const height = Math.max(80, asset.height * scale);

      const shape = new DGMImage();
      shape.imageData = asset.url;
      shape.imageWidth = asset.width;
      shape.imageHeight = asset.height;
      shape.width = width;
      shape.height = height;
      shape.left = (currentPage.width - width) / 2;
      shape.top = (currentPage.height - height) / 2;
      shape.sizable = Sizable.RATIO;
      shape.textEditable = false;
      (shape as DGMImage & { __imageId?: string }).__imageId = asset.id;

      editor.actions.insert(shape);
      editor.selection.select([shape]);
      editor.repaint();
    },
    [pageQuery.data]
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith("image/"));
      if (!images.length) return;

      for (const file of images) {
        const toastId = toast.loading(`Uploading ${file.name}…`);
        try {
          const { asset, deduped } = await uploadImage({
            uid,
            drawingId,
            file,
          });
          insertImageAsset(asset);
          void queryClient.invalidateQueries({
            queryKey: queryKeys.images(drawingId),
          });
          toast.success(deduped ? "Image reused" : "Image added", {
            id: toastId,
          });
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Could not upload that image",
            { id: toastId }
          );
        }
      }
    },
    [drawingId, insertImageAsset, queryClient, uid]
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

  if (
    drawingQuery.isLoading ||
    pagesQuery.isLoading ||
    pageQuery.isLoading ||
    shapesQuery.isLoading ||
    imagesQuery.isLoading
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

  if (!drawingQuery.data || !page) {
    return (
      <div className="flex h-[100dvh] items-center justify-center px-6">
        <EmptyState
          icon={ImagePlus}
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

  return (
    <div className="fixed inset-0 h-[100dvh] w-full select-none overflow-hidden bg-muted/20">
      <DgmCanvas
        key={page.id}
        uid={uid}
        drawingId={drawingId}
        page={page}
        records={shapesQuery.data ?? []}
        images={imagesQuery.imagesById}
        isFirstPage={pages[0]?.id === page.id}
        onRequestImage={() => fileInput.current?.click()}
        onDropFiles={(files) => void handleFiles(files)}
      />

      <EditorTopBars
        title={title}
        onTitleChange={setTitle}
        onCommitTitle={commitTitle}
        onBack={() => {
          void flush().then(() => navigate("/"));
        }}
        onExport={() => setExportOpen(true)}
        onShowShortcuts={() => setShortcutsOpen(true)}
        navigatorOpen={navigatorOpen}
        onToggleNavigator={() => setNavigatorOpen((value) => !value)}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((value) => !value)}
        onAddPage={() => void handleAddPage()}
        onDuplicatePage={() => void handleDuplicatePage(page)}
        onDeletePage={() => setDeletingPage(page)}
      />

      <NavigatorPanel
        open={navigatorOpen}
        pages={pages}
        currentPageId={page.id}
        onNavigate={(target) => void handleNavigate(target)}
        onAddPage={() => void handleAddPage()}
        onDuplicatePage={(target) => void handleDuplicatePage(target)}
        onRequestDeletePage={setDeletingPage}
        onRenamePage={handleRenamePage}
        onReorderPage={handleReorderPage}
      />

      <InspectorPanel
        open={inspectorOpen}
        page={page}
        onUpdatePage={handleUpdatePage}
      />

      <EditorToolbar onRequestImage={() => fileInput.current?.click()} />

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        fileName={drawingQuery.data.title}
      />

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      <ConfirmDialog
        open={Boolean(deletingPage)}
        onOpenChange={(open) => {
          if (!open) setDeletingPage(null);
        }}
        title="Delete this page?"
        description={
          deletingPage
            ? `“${deletingPage.name}” and everything on it will be permanently deleted.`
            : ""
        }
        confirmLabel="Delete page"
        destructive
        loading={deletePage.isPending}
        onConfirm={() => void handleDeletePage()}
      />

      <input
        ref={fileInput}
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
    </div>
  );
}
