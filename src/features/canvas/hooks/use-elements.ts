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

export function useDrawingImages(drawingId: string, imageIds: string[]) {
  const key = imageIds.join(",");
  return useQuery({
    queryKey: [...queryKeys.images(drawingId), key],
    queryFn: () => fetchImages(drawingId, imageIds),
    enabled: Boolean(drawingId) && imageIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
