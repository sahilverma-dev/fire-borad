import { QueryDocumentSnapshot } from "firebase/firestore";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  DRAWINGS_PAGE_SIZE,
  createDrawing,
  deleteDrawingPermanently,
  duplicateDrawing,
  fetchDrawing,
  fetchDrawings,
  renameDrawing,
  restoreDrawing,
  softDeleteDrawing,
  type DrawingSort,
} from "@/features/drawings/api";
import { queryKeys } from "@/lib/query-keys";
import type { Drawing } from "@/types/models";

export function useDrawings(
  uid: string,
  mode: "active" | "trash",
  sort: DrawingSort
) {
  return useInfiniteQuery({
    queryKey: queryKeys.drawings(uid, mode, sort),
    queryFn: ({ pageParam }) => fetchDrawings(uid, mode, sort, pageParam),
    initialPageParam: null as QueryDocumentSnapshot<Drawing> | null,
    getNextPageParam: (lastPage) =>
      lastPage.items.length === DRAWINGS_PAGE_SIZE
        ? lastPage.cursor
        : undefined,
    enabled: Boolean(uid),
  });
}

export function useDrawing(drawingId: string) {
  return useQuery({
    queryKey: queryKeys.drawing(drawingId),
    queryFn: () => fetchDrawing(drawingId),
    enabled: Boolean(drawingId),
  });
}

function useInvalidateDrawings() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["drawings"] });
}

export function useCreateDrawing() {
  const invalidate = useInvalidateDrawings();
  return useMutation({
    mutationFn: ({ uid, title }: { uid: string; title: string }) =>
      createDrawing(uid, title),
    onSuccess: () => invalidate(),
  });
}

export function useRenameDrawing() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateDrawings();
  return useMutation({
    mutationFn: ({ drawingId, title }: { drawingId: string; title: string }) =>
      renameDrawing(drawingId, title),
    onSuccess: (_, variables) => {
      invalidate();
      queryClient.setQueryData<Drawing | null>(
        queryKeys.drawing(variables.drawingId),
        (drawing) => (drawing ? { ...drawing, title: variables.title } : drawing)
      );
    },
  });
}

export function useSoftDeleteDrawing() {
  const invalidate = useInvalidateDrawings();
  return useMutation({
    mutationFn: (drawingId: string) => softDeleteDrawing(drawingId),
    onSuccess: () => invalidate(),
  });
}

export function useRestoreDrawing() {
  const invalidate = useInvalidateDrawings();
  return useMutation({
    mutationFn: (drawingId: string) => restoreDrawing(drawingId),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteDrawingForever() {
  const invalidate = useInvalidateDrawings();
  return useMutation({
    mutationFn: (drawing: Drawing) => deleteDrawingPermanently(drawing),
    onSuccess: () => invalidate(),
  });
}

export function useDuplicateDrawing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ drawing, uid }: { drawing: Drawing; uid: string }) =>
      duplicateDrawing(drawing, uid),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["drawings"] }),
  });
}
