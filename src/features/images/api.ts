import {
  deleteDoc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { db, storage } from "@/firebase/config";
import { imageDoc, imagesCol } from "@/lib/firestore/paths";
import { newId } from "@/lib/id";
import { storagePaths } from "@/lib/storage-paths";
import type { ImageAsset } from "@/types/models";
import { processImageFile } from "@/features/images/process-image";

export async function fetchImages(drawingId: string): Promise<ImageAsset[]> {
  const snapshot = await getDocs(imagesCol(drawingId));
  return snapshot.docs.map((document) => document.data());
}

export interface UploadedImage {
  asset: ImageAsset;
  deduped: boolean;
}

export async function uploadImage(options: {
  uid: string;
  drawingId: string;
  file: File;
}): Promise<UploadedImage> {
  const processed = await processImageFile(options.file);

  const existing = await getDocs(
    query(
      imagesCol(options.drawingId),
      where("sha256", "==", processed.sha256),
      limit(1)
    )
  );

  if (!existing.empty) {
    return { asset: existing.docs[0].data(), deduped: true };
  }

  const imageId = newId();
  const originalPath = storagePaths.original(
    options.uid,
    options.drawingId,
    imageId,
    processed.ext
  );
  const largePath = storagePaths.large(
    options.uid,
    options.drawingId,
    imageId
  );
  const thumbPath = storagePaths.thumb(
    options.uid,
    options.drawingId,
    imageId
  );

  const originalRef = ref(storage, originalPath);
  const largeRef = ref(storage, largePath);
  const thumbRef = ref(storage, thumbPath);

  try {
    await Promise.all([
      uploadBytes(originalRef, processed.original, {
        contentType: processed.contentType,
      }),
      uploadBytes(largeRef, processed.large, { contentType: "image/webp" }),
      uploadBytes(thumbRef, processed.thumb, { contentType: "image/webp" }),
    ]);

    const [url, thumbUrl] = await Promise.all([
      getDownloadURL(largeRef),
      getDownloadURL(thumbRef),
    ]);

    await setDoc(imageDoc(options.drawingId, imageId), {
      drawingId: options.drawingId,
      storagePath: originalPath,
      largePath,
      thumbPath,
      url,
      thumbUrl,
      width: processed.width,
      height: processed.height,
      bytes:
        processed.original.size +
        processed.large.size +
        processed.thumb.size,
      contentType: processed.contentType,
      sha256: processed.sha256,
      refCount: 0,
      createdAt: serverTimestamp(),
    });

    return {
      deduped: false,
      asset: {
        id: imageId,
        drawingId: options.drawingId,
        storagePath: originalPath,
        largePath,
        thumbPath,
        url,
        thumbUrl,
        width: processed.width,
        height: processed.height,
        bytes:
          processed.original.size +
          processed.large.size +
          processed.thumb.size,
        contentType: processed.contentType,
        sha256: processed.sha256,
        refCount: 0,
        createdAt: new Date(),
      },
    };
  } catch (error) {
    await Promise.allSettled([
      deleteObject(originalRef),
      deleteObject(largeRef),
      deleteObject(thumbRef),
    ]);
    throw error;
  }
}

/** Adds or removes one usage of an image. Deletes the asset when unused. */
export async function adjustImageUsage(
  drawingId: string,
  imageId: string,
  delta: number
): Promise<boolean> {
  if (delta === 0) return false;

  const documentRef = imageDoc(drawingId, imageId);
  let removedPaths: ImageAsset | null = null;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(documentRef);
    if (!snapshot.exists()) return;

    const data = snapshot.data() as ImageAsset;
    const next = (data.refCount ?? 0) + delta;

    if (next <= 0) {
      removedPaths = data;
      transaction.delete(documentRef);
    } else {
      transaction.update(documentRef, { refCount: increment(delta) });
    }
  });

  if (removedPaths) {
    const asset = removedPaths as ImageAsset;
    await deleteImageFiles(asset);
    return true;
  }

  return false;
}

export async function deleteImageFiles(paths: {
  storagePath: string;
  largePath: string;
  thumbPath: string;
}): Promise<void> {
  await Promise.allSettled([
    deleteObject(ref(storage, paths.storagePath)),
    deleteObject(ref(storage, paths.largePath)),
    deleteObject(ref(storage, paths.thumbPath)),
  ]);
}

export async function deleteImageAsset(
  drawingId: string,
  asset: ImageAsset
): Promise<void> {
  await deleteImageFiles(asset);
  await deleteDoc(imageDoc(drawingId, asset.id));
}
