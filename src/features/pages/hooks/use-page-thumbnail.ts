import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { savePageThumbnail } from "@/features/pages/api";
import { elementsToSvg, svgToWebp } from "@/features/pages/thumbnail";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { queryKeys } from "@/lib/query-keys";
import type { Drawing, Page } from "@/types/models";

const THUMBNAIL_DELAY = 2200;

export function usePageThumbnail(options: {
  drawingId: string;
  uid: string;
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
      const blob = await svgToWebp(svg, page.width, page.height);
      if (!blob) return;

      try {
        const url = await savePageThumbnail({
          drawingId: options.drawingId,
          pageId: page.id,
          uid: options.uid,
          blob,
          isFirstPage: options.isFirstPage,
        });

        queryClient.setQueryData<Page[]>(
          queryKeys.pages(options.drawingId),
          (pages) =>
            pages?.map((item) =>
              item.id === page.id
                ? {
                    ...item,
                    thumbnailUrl: url,
                    thumbnailPath: `users/${options.uid}/drawings/${options.drawingId}/thumbs/${page.id}.webp`,
                  }
                : item
            )
        );

        if (options.isFirstPage) {
          queryClient.setQueryData<Drawing | null>(
            queryKeys.drawing(options.drawingId),
            (drawing) =>
              drawing ? { ...drawing, coverThumbUrl: url } : drawing
          );
        }
      } catch {
        // Thumbnails are a nice-to-have; never interrupt editing for them.
      }
    }, THUMBNAIL_DELAY);

    return () => window.clearTimeout(timer);
  }, [status, options.enabled, options.drawingId, options.uid, options.isFirstPage, queryClient]);
}
