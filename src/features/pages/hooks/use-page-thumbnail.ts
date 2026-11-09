import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { renderPageThumbnail } from "@/features/canvas/lib/thumbnail";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { savePageThumbnail } from "@/features/pages/api";
import { queryKeys } from "@/lib/query-keys";
import type { Drawing, Page } from "@/types/models";

const THUMBNAIL_DELAY = 2200;

export function usePageThumbnail(options: {
  drawingId: string;
  isFirstPage: boolean;
  enabled: boolean;
}) {
  const status = useEditorStore((state) => state.status);
  const editor = useEditorStore((state) => state.editor);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!options.enabled || status !== "saved" || !editor) return;

    const timer = window.setTimeout(async () => {
      const state = useEditorStore.getState();
      if (!state.editor || state.status !== "saved") return;

      const page = state.editor.getCurrentPage();
      if (!page) return;

      const dataUrl = renderPageThumbnail(state.editor, page, 400, 0.7);
      if (!dataUrl) return;

      const coverUrl = options.isFirstPage
        ? renderPageThumbnail(state.editor, page, 320, 0.55)
        : null;

      try {
        await savePageThumbnail({
          drawingId: options.drawingId,
          pageId: page.id,
          dataUrl,
          coverUrl,
          isFirstPage: options.isFirstPage,
        });

        queryClient.setQueryData<Page[]>(
          queryKeys.pages(options.drawingId),
          (pages) =>
            pages?.map((item) =>
              item.id === page.id
                ? { ...item, thumbnailUrl: dataUrl }
                : item
            )
        );

        if (options.isFirstPage && coverUrl) {
          queryClient.setQueryData<Drawing | null>(
            queryKeys.drawing(options.drawingId),
            (drawing) =>
              drawing ? { ...drawing, coverThumbUrl: coverUrl } : drawing
          );
        }
      } catch {
        // Thumbnails are cosmetic; never interrupt editing for them.
      }
    }, THUMBNAIL_DELAY);

    return () => window.clearTimeout(timer);
  }, [status, editor, options.enabled, options.drawingId, options.isFirstPage, queryClient]);
}
