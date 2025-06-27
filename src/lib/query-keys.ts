export const queryKeys = {
  drawings: (
    uid: string,
    mode: "active" | "trash",
    sort: "updated" | "created" | "name"
  ) => ["drawings", uid, mode, sort] as const,
  drawing: (drawingId: string) => ["drawing", drawingId] as const,
  pages: (drawingId: string) => ["pages", drawingId] as const,
  page: (drawingId: string, pageId: string) =>
    ["page", drawingId, pageId] as const,
  elements: (drawingId: string, pageId: string) =>
    ["elements", drawingId, pageId] as const,
  images: (drawingId: string) => ["images", drawingId] as const,
};
