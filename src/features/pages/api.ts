import {
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { adjustImageUsage } from "@/features/images/api";
import { commitWrites, type PendingWrite } from "@/lib/firestore/batch";
import { newId } from "@/lib/id";
import {
  drawingDoc,
  elementDoc,
  elementsRawCol,
  pageDoc,
  pageTypedDoc,
  pagesCol,
} from "@/lib/firestore/paths";
import type { Page } from "@/types/models";

export async function fetchPages(drawingId: string): Promise<Page[]> {
  const snapshot = await getDocs(query(pagesCol(drawingId), orderBy("order")));
  return snapshot.docs.map((document) => document.data());
}

export async function fetchPage(
  drawingId: string,
  pageId: string
): Promise<Page | null> {
  const snapshot = await getDoc(pageTypedDoc(drawingId, pageId));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function createPage(options: {
  drawingId: string;
  uid: string;
  order: string;
  name: string;
}): Promise<string> {
  const pageId = newId();
  const batch = writeBatch(db);

  batch.set(pageDoc(options.drawingId, pageId), {
    drawingId: options.drawingId,
    name: options.name,
    order: options.order,
    width: 1600,
    height: 1000,
    background: { type: "dots", color: "#ffffff" },
    thumbnailUrl: null,
    elementCount: 0,
    version: 1,
    schemaVersion: 2,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: options.uid,
  });

  batch.update(drawingDoc(options.drawingId), {
    pageCount: increment(1),
    lastPageId: pageId,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return pageId;
}

export async function renamePage(
  drawingId: string,
  pageId: string,
  name: string
): Promise<void> {
  await commitWrites([
    {
      ref: pageDoc(drawingId, pageId),
      data: {
        name: name.trim() || "Untitled page",
        updatedAt: serverTimestamp(),
      },
      mode: "update",
    },
  ]);
}

export async function updatePageOrder(
  drawingId: string,
  pageId: string,
  order: string
): Promise<void> {
  await commitWrites([
    {
      ref: pageDoc(drawingId, pageId),
      data: { order, updatedAt: serverTimestamp() },
      mode: "update",
    },
  ]);
}

export async function updatePageSettings(
  drawingId: string,
  pageId: string,
  patch: {
    name?: string;
    width?: number;
    height?: number;
    background?: Page["background"];
  }
): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (typeof patch.name === "string") {
    data.name = patch.name.trim() || "Untitled page";
  }
  if (typeof patch.width === "number") data.width = patch.width;
  if (typeof patch.height === "number") data.height = patch.height;
  if (patch.background) data.background = patch.background;

  await commitWrites([
    {
      ref: pageDoc(drawingId, pageId),
      data,
      mode: "update",
    },
  ]);
}

export async function duplicatePage(
  drawingId: string,
  page: Page,
  uid: string,
  order: string
): Promise<string> {
  const pageId = newId();
  const elementsSnapshot = await getDocs(elementsRawCol(drawingId, page.id));
  const writes: PendingWrite[] = [];
  const imageUsage = new Map<string, number>();

  const trackImage = (imageId: string | undefined | null) => {
    if (!imageId) return;
    imageUsage.set(imageId, (imageUsage.get(imageId) ?? 0) + 1);
  };

  writes.push({
    ref: pageDoc(drawingId, pageId),
    data: {
      drawingId,
      name: `${page.name} copy`,
      order,
      width: page.width,
      height: page.height,
      background: page.background,
      thumbnailUrl: null,
      elementCount: page.elementCount,
      version: 1,
      schemaVersion: 2,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: uid,
    },
    mode: "set",
  });

  for (const element of elementsSnapshot.docs) {
    const data = element.data() as Record<string, unknown>;

    if (data.shape && typeof data.shape === "object") {
      const shape = structuredClone(data.shape) as Record<string, unknown>;
      shape.parent = pageId;
      const imageIds =
        data.imageIds && typeof data.imageIds === "object"
          ? (data.imageIds as Record<string, string>)
          : {};
      for (const imageId of Object.values(imageIds)) trackImage(imageId);

      writes.push({
        ref: elementDoc(drawingId, pageId, element.id),
        data: {
          index: typeof data.index === "number" ? data.index : 0,
          shape,
          imageIds,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: uid,
        },
        mode: "set",
      });
      continue;
    }

    const legacy = { ...data };
    delete legacy.id;
    delete legacy.createdAt;
    delete legacy.updatedAt;
    if (legacy.type === "image") {
      trackImage(legacy.imageId as string | undefined);
    }

    writes.push({
      ref: elementDoc(drawingId, pageId, newId()),
      data: {
        ...legacy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: uid,
      },
      mode: "set",
    });
  }

  writes.push({
    ref: drawingDoc(drawingId),
    data: {
      pageCount: increment(1),
      lastPageId: pageId,
      updatedAt: serverTimestamp(),
    },
    mode: "update",
  });

  await commitWrites(writes);

  for (const [imageId, count] of imageUsage) {
    await adjustImageUsage(drawingId, imageId, count);
  }

  return pageId;
}

export async function deletePage(
  drawingId: string,
  page: Page,
  nextPageId: string | null
): Promise<void> {
  const elementsSnapshot = await getDocs(elementsRawCol(drawingId, page.id));
  const imageUsage = new Map<string, number>();

  const trackImage = (imageId: string | undefined | null) => {
    if (!imageId) return;
    imageUsage.set(imageId, (imageUsage.get(imageId) ?? 0) + 1);
  };

  for (const element of elementsSnapshot.docs) {
    const data = element.data() as Record<string, unknown>;
    if (data.imageIds && typeof data.imageIds === "object") {
      for (const imageId of Object.values(
        data.imageIds as Record<string, string>
      )) {
        trackImage(imageId);
      }
    } else if (data.type === "image") {
      trackImage(data.imageId as string | undefined);
    }
  }

  for (let i = 0; i < elementsSnapshot.docs.length; i += 400) {
    const batch = writeBatch(db);
    for (const element of elementsSnapshot.docs.slice(i, i + 400)) {
      batch.delete(element.ref);
    }
    await batch.commit();
  }

  const batch = writeBatch(db);
  batch.delete(pageDoc(drawingId, page.id));
  batch.update(drawingDoc(drawingId), {
    pageCount: increment(-1),
    lastPageId: nextPageId,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  for (const [imageId, count] of imageUsage) {
    await adjustImageUsage(drawingId, imageId, -count);
  }
}

export async function savePageThumbnail(options: {
  drawingId: string;
  pageId: string;
  dataUrl: string;
  /** Smaller version used as the drawing cover on the dashboard. */
  coverUrl?: string | null;
  isFirstPage: boolean;
}): Promise<string> {
  const writes: PendingWrite[] = [
    {
      ref: pageDoc(options.drawingId, options.pageId),
      data: { thumbnailUrl: options.dataUrl },
      mode: "update",
    },
  ];

  if (options.isFirstPage && options.coverUrl) {
    writes.push({
      ref: drawingDoc(options.drawingId),
      data: { coverThumbUrl: options.coverUrl },
      mode: "update",
    });
  }

  await commitWrites(writes);
  return options.dataUrl;
}
