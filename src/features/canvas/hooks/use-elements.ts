import { useQuery } from "@tanstack/react-query";

import { fetchPageShapeRecords } from "@/features/canvas/api/shapes";
import { fetchImages } from "@/features/images/api";
import { queryKeys } from "@/lib/query-keys";
import type { ImageAsset } from "@/types/models";
import { useMemo } from "react";

export function usePageShapes(drawingId: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.elements(drawingId, pageId),
    queryFn: () => fetchPageShapeRecords(drawingId, pageId),
    enabled: Boolean(drawingId && pageId),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useDrawingImages(drawingId: string) {
  const query = useQuery({
    queryKey: queryKeys.images(drawingId),
    queryFn: () => fetchImages(drawingId),
    enabled: Boolean(drawingId),
    staleTime: 5 * 60 * 1000,
  });

  const imagesById = useMemo(() => {
    const map = new Map<string, ImageAsset>();
    for (const asset of query.data ?? []) map.set(asset.id, asset);
    return map;
  }, [query.data]);

  return { ...query, imagesById };
}
