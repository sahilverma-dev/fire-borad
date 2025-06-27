import { useQuery } from "@tanstack/react-query";

import { fetchElements } from "@/features/canvas/api/elements";
import { fetchImages } from "@/features/images/api";
import { queryKeys } from "@/lib/query-keys";

export function useElements(drawingId: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.elements(drawingId, pageId),
    queryFn: () => fetchElements(drawingId, pageId),
    enabled: Boolean(drawingId && pageId),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useDrawingImages(drawingId: string) {
  return useQuery({
    queryKey: queryKeys.images(drawingId),
    queryFn: () => fetchImages(drawingId),
    enabled: Boolean(drawingId),
    staleTime: 5 * 60 * 1000,
  });
}
