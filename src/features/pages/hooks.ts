import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPage,
  deletePage,
  duplicatePage,
  fetchPage,
  fetchPages,
  renamePage,
  updatePageOrder,
} from "@/features/pages/api";
import { queryKeys } from "@/lib/query-keys";
import type { Page } from "@/types/models";

export function usePages(drawingId: string) {
  return useQuery({
    queryKey: queryKeys.pages(drawingId),
    queryFn: () => fetchPages(drawingId),
    enabled: Boolean(drawingId),
  });
}

export function usePage(drawingId: string, pageId: string) {
  return useQuery({
    queryKey: queryKeys.page(drawingId, pageId),
    queryFn: () => fetchPage(drawingId, pageId),
    enabled: Boolean(drawingId && pageId),
  });
}

function useRefreshPages(drawingId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.pages(drawingId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.drawing(drawingId),
    });
  };
}

export function useCreatePage(drawingId: string) {
  const refresh = useRefreshPages(drawingId);
  return useMutation({
    mutationFn: (options: {
      uid: string;
      order: string;
      name: string;
    }) => createPage({ drawingId, ...options }),
    onSuccess: refresh,
  });
}

export function useRenamePage(drawingId: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshPages(drawingId);
  return useMutation({
    mutationFn: ({ pageId, name }: { pageId: string; name: string }) =>
      renamePage(drawingId, pageId, name),
    onSuccess: (_, variables) => {
      refresh();
      queryClient.setQueryData<Page | null>(
        queryKeys.page(drawingId, variables.pageId),
        (page) => (page ? { ...page, name: variables.name } : page)
      );
    },
  });
}

export function useReorderPage(drawingId: string) {
  const refresh = useRefreshPages(drawingId);
  return useMutation({
    mutationFn: ({ pageId, order }: { pageId: string; order: string }) =>
      updatePageOrder(drawingId, pageId, order),
    onSuccess: refresh,
  });
}

export function useDuplicatePage(drawingId: string) {
  const refresh = useRefreshPages(drawingId);
  return useMutation({
    mutationFn: ({
      page,
      uid,
      order,
    }: {
      page: Page;
      uid: string;
      order: string;
    }) => duplicatePage(drawingId, page, uid, order),
    onSuccess: refresh,
  });
}

export function useDeletePage(drawingId: string) {
  const refresh = useRefreshPages(drawingId);
  return useMutation({
    mutationFn: ({
      page,
      nextPageId,
    }: {
      page: Page;
      nextPageId: string | null;
    }) => deletePage(drawingId, page, nextPageId),
    onSuccess: refresh,
  });
}
