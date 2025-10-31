import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { savePageThumbnail } from "@/features/pages/api";
import { elementsToSvg, svgToDataUrl } from "@/features/pages/thumbnail";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { queryKeys } from "@/lib/query-keys";
import type { Drawing, Page } from "@/types/models";

const THUMBNAIL_DELAY = 2200;

export function usePageThumbnail(options: {
  drawingId: string;
  isFirstPage: boolean;
  enabled: boolean;
}) {
  const status = useEditorStore((state) => state.status);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!options.enabled || status !== "saved") return;

    const timer = window.setTimeout(async () => {
      const state = useEditorStore.getState();
      if (!state.page || state.status !== "saved") return;

      const page = state.page;
      const elements = Object.values(state.elements).sort((a, b) =>
        a.order.localeCompare(b.order)
      );
      const svg = elementsToSvg(elements, page);

      // Page strip thumbnail (max 400px).
      const dataUrl = await svgToDataUrl(svg, page.width, page.height, 400, 0.7);
      if (!dataUrl) return;

      // Dashboard cover is tiny and only needed for the first page.
      const coverUrl =
        options.isFirstPage
          ? await svgToDataUrl(svg, page.width, page.height, 320, 0.55)
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
  }, [status, options.enabled, options.drawingId, options.isFirstPage, queryClient]);
}
