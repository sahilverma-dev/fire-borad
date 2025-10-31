import {
  deleteDoc,
  documentId,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { imageDoc, imagesCol } from "@/lib/firestore/paths";
import { newId } from "@/lib/id";
import type { ImageAsset } from "@/types/models";
import { processImageFile } from "@/features/images/process-image";

export async function fetchImages(
  drawingId: string,
  imageIds?: string[]
): Promise<ImageAsset[]> {
  const collectionRef = imagesCol(drawingId);

  if (!imageIds) {
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map((document) => document.data());
  }

  if (!imageIds.length) return [];

  const chunks: string[][] = [];
  for (let index = 0; index < imageIds.length; index += 30) {
    chunks.push(imageIds.slice(index, index + 30));
  }

  const snapshots = await Promise.all(
    chunks.map((ids) =>
      getDocs(query(collectionRef, where(documentId(), "in", ids)))
    )
  );

  const byId = new Map<string, ImageAsset>();
  for (const snapshot of snapshots) {
    for (const document of snapshot.docs) {
      byId.set(document.id, document.data());
    }
  }
  return Array.from(byId.values());
}

export interface UploadedImage {
  asset: ImageAsset;
  deduped: boolean;
}

/**
 * Compresses the image and stores it as data URLs inside a Firestore document.
 * No Cloud Storage bucket is involved.
 */
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

  await setDoc(imageDoc(options.drawingId, imageId), {
    drawingId: options.drawingId,
    url: processed.url,
    thumbUrl: processed.thumbUrl,
    width: processed.width,
    height: processed.height,
    bytes: processed.bytes,
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
      url: processed.url,
      thumbUrl: processed.thumbUrl,
      width: processed.width,
      height: processed.height,
      bytes: processed.bytes,
      contentType: processed.contentType,
      sha256: processed.sha256,
      refCount: 0,
      createdAt: new Date(),
    },
  };
}

/** Adds or removes one usage of an image. Deletes the document when unused. */
export async function adjustImageUsage(
  drawingId: string,
  imageId: string,
  delta: number
): Promise<boolean> {
  if (delta === 0) return false;

  const documentRef = imageDoc(drawingId, imageId);
  let removed = false;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(documentRef);
    if (!snapshot.exists()) return;

    const data = snapshot.data() as ImageAsset;
    const next = (data.refCount ?? 0) + delta;

    if (next <= 0) {
      removed = true;
      transaction.delete(documentRef);
    } else {
      transaction.update(documentRef, { refCount: increment(delta) });
    }
  });

  return removed;
}

export async function deleteImageAsset(
  drawingId: string,
  asset: ImageAsset
): Promise<void> {
  await deleteDoc(imageDoc(drawingId, asset.id));
}
