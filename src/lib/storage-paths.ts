export const storagePaths = {
  original: (uid: string, drawingId: string, imageId: string, ext: string) =>
    `users/${uid}/drawings/${drawingId}/images/${imageId}/original.${ext}`,
  large: (uid: string, drawingId: string, imageId: string) =>
    `users/${uid}/drawings/${drawingId}/images/${imageId}/large.webp`,
  thumb: (uid: string, drawingId: string, imageId: string) =>
    `users/${uid}/drawings/${drawingId}/images/${imageId}/thumb.webp`,
  pageThumb: (uid: string, drawingId: string, pageId: string) =>
    `users/${uid}/drawings/${drawingId}/thumbs/${pageId}.webp`,
  avatar: (uid: string, fileName: string) => `users/${uid}/avatars/${fileName}`,
};

export function isOwnedStoragePath(uid: string, path: string): boolean {
  return path.startsWith(`users/${uid}/`);
}
