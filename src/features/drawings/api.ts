import { FirebaseError } from "firebase/app";
import {
  DocumentReference,
  QueryDocumentSnapshot,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
  writeBatch,
} from "firebase/firestore";

import { commitWrites, type PendingWrite } from "@/lib/firestore/batch";
import { db } from "@/firebase/config";
import { newId } from "@/lib/id";
import {
  drawingsCol,
  drawingDoc,
  drawingTypedDoc,
  elementDoc,
  elementsRawCol,
  imageDoc,
  imagesRawCol,
  pageDoc,
  pagesCol,
  pagesRawCol,
} from "@/lib/firestore/paths";
import type { BoardElement, Drawing, Page } from "@/types/models";

export const DRAWINGS_PAGE_SIZE = 24;

export type DrawingSort = "updated" | "created" | "name";

export interface DrawingsPage {
  items: Drawing[];
  cursor: QueryDocumentSnapshot<Drawing> | null;
}

export async function fetchDrawings(
  uid: string,
  mode: "active" | "trash",
  sort: DrawingSort,
  cursor: QueryDocumentSnapshot<Drawing> | null
): Promise<DrawingsPage> {
  try {
    return await fetchIndexedDrawings(uid, mode, sort, cursor);
  } catch (error) {
    if (isMissingIndex(error)) {
      console.warn(
        "Firestore composite index is missing — falling back to client-side sorting. Deploy firestore.indexes.json to enable server-side pagination.",
        error
      );
      return fetchDrawingsWithoutIndex(uid, mode, sort);
    }
    throw error;
  }
}

function isMissingIndex(error: unknown): boolean {
  return (
    error instanceof FirebaseError &&
    error.code === "failed-precondition" &&
    /index/i.test(error.message)
  );
}

async function fetchIndexedDrawings(
  uid: string,
  mode: "active" | "trash",
  sort: DrawingSort,
  cursor: QueryDocumentSnapshot<Drawing> | null
): Promise<DrawingsPage> {
  const orderField =
    mode === "trash"
      ? "deletedAt"
      : sort === "created"
        ? "createdAt"
        : sort === "name"
          ? "title"
          : "updatedAt";

  const snapshot = await getDocs(
    query(
      drawingsCol(),
      where("memberIds", "array-contains", uid),
      where("isDeleted", "==", mode === "trash"),
      orderBy(orderField, mode === "trash" || sort !== "name" ? "desc" : "asc"),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(DRAWINGS_PAGE_SIZE)
    )
  );

  return {
    items: snapshot.docs.map((document) => document.data()),
    cursor: snapshot.docs.length
      ? snapshot.docs[snapshot.docs.length - 1]
      : null,
  };
}

/**
 * Fallback for projects that don't have the composite index yet: `array-contains`
 * only uses the automatic single-field index. Sorting/paging happens locally.
 */
async function fetchDrawingsWithoutIndex(
  uid: string,
  mode: "active" | "trash",
  sort: DrawingSort
): Promise<DrawingsPage> {
  const snapshot = await getDocs(
    query(
      drawingsCol(),
      where("memberIds", "array-contains", uid),
      limit(500)
    )
  );

  const items = snapshot.docs
    .map((document) => document.data())
    .filter((drawing) => drawing.isDeleted === (mode === "trash"));

  items.sort((a, b) => {
    if (mode === "trash") {
      return (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0);
    }
    if (sort === "name") return a.title.localeCompare(b.title);
    if (sort === "created") {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  return { items, cursor: null };
}

export async function fetchDrawing(drawingId: string): Promise<Drawing | null> {
  const snapshot = await getDoc(drawingTypedDoc(drawingId));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function createDrawing(
  uid: string,
  title: string
): Promise<{ drawingId: string; pageId: string }> {
  const drawingId = newId();
  const pageId = newId();

  // The page rule reads the parent drawing, so the drawing must exist before
  // the page write is committed.
  await commitWrites([
    {
      ref: drawingDoc(drawingId),
      data: {
        ownerId: uid,
        memberIds: [uid],
        title: title.trim() || "Untitled drawing",
        description: null,
        coverThumbUrl: null,
        pageCount: 1,
        elementCount: 0,
        lastPageId: pageId,
        isDeleted: false,
        deletedAt: null,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      mode: "set",
    },
  ]);

  await commitWrites([
    {
      ref: pageDoc(drawingId, pageId),
      data: {
        drawingId,
        name: "Page 1",
        order: "a0",
        width: 1600,
        height: 1000,
        background: { type: "dots", color: "#ffffff" },
        thumbnailUrl: null,
        elementCount: 0,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: uid,
      },
      mode: "set",
    },
  ]);

  return { drawingId, pageId };
}

export async function renameDrawing(
  drawingId: string,
  title: string
): Promise<void> {
  await commitWrites([
    {
      ref: drawingDoc(drawingId),
      data: {
        title: title.trim() || "Untitled drawing",
        updatedAt: serverTimestamp(),
      },
      mode: "update",
    },
  ]);
}

export async function setDrawingCover(
  drawingId: string,
  coverThumbUrl: string | null
): Promise<void> {
  await commitWrites([
    { ref: drawingDoc(drawingId), data: { coverThumbUrl }, mode: "update" },
  ]);
}

export async function setLastPage(
  drawingId: string,
  pageId: string
): Promise<void> {
  await commitWrites([
    {
      ref: drawingDoc(drawingId),
      data: { lastPageId: pageId, updatedAt: serverTimestamp() },
      mode: "update",
    },
  ]);
}

export async function softDeleteDrawing(drawingId: string): Promise<void> {
  await commitWrites([
    {
      ref: drawingDoc(drawingId),
      data: {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      mode: "update",
    },
  ]);
}

export async function restoreDrawing(drawingId: string): Promise<void> {
  await commitWrites([
    {
      ref: drawingDoc(drawingId),
      data: { isDeleted: false, deletedAt: null, updatedAt: serverTimestamp() },
      mode: "update",
    },
  ]);
}

async function deleteRefs(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    for (const document of refs.slice(i, i + 400)) {
      batch.delete(document);
    }
    await batch.commit();
  }
}

/** Permanently removes a drawing, its pages, elements and image documents. */
export async function deleteDrawingPermanently(
  drawing: Drawing
): Promise<void> {
  const pagesSnapshot = await getDocs(pagesRawCol(drawing.id));

  for (const page of pagesSnapshot.docs) {
    const elementSnapshot = await getDocs(
      elementsRawCol(drawing.id, page.id)
    );
    await deleteRefs(elementSnapshot.docs.map((element) => element.ref));
  }

  await deleteRefs(pagesSnapshot.docs.map((page) => page.ref));

  const imagesSnapshot = await getDocs(imagesRawCol(drawing.id));
  await deleteRefs(imagesSnapshot.docs.map((image) => image.ref));
  await deleteRefs([drawingDoc(drawing.id)]);
}

function preparedElement(
  element: BoardElement,
  uid: string,
  now: Date
): BoardElement {
  return {
    ...element,
    createdBy: element.createdBy || uid,
    createdAt: element.createdAt ?? now,
    updatedAt: now,
  };
}

function elementPayload(element: BoardElement): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...element };
  delete payload.id;
  return payload;
}

export async function duplicateDrawing(
  source: Drawing,
  uid: string
): Promise<{ drawingId: string; pageId: string }> {
  const drawingId = newId();
  const now = new Date();

  const [pagesSnapshot, imagesSnapshot] = await Promise.all([
    getDocs(pagesCol(source.id)),
    getDocs(imagesRawCol(source.id)),
  ]);

  const imageIdMap = new Map<string, string>();
  const imageWrites: PendingWrite[] = [];
  const imageWritesById = new Map<string, PendingWrite>();
  const imageUsage = new Map<string, number>();

  for (const imageSnapshot of imagesSnapshot.docs) {
    const data = imageSnapshot.data() as {
      url: string;
      thumbUrl: string;
      width: number;
      height: number;
      bytes: number;
      contentType: string;
      sha256: string;
    };

    const newImageId = newId();
    imageIdMap.set(imageSnapshot.id, newImageId);

    const imageWrite: PendingWrite = {
      ref: imageDoc(drawingId, newImageId),
      data: {
        drawingId,
        url: data.url,
        thumbUrl: data.thumbUrl,
        width: data.width,
        height: data.height,
        bytes: data.bytes,
        contentType: data.contentType,
        sha256: data.sha256,
        refCount: 0,
        createdAt: serverTimestamp(),
      },
      mode: "set",
    };
    imageWrites.push(imageWrite);
    imageWritesById.set(newImageId, imageWrite);
  }

  const writes: PendingWrite[] = [];
  const firstPageId = newId();
  let firstPage = true;

  writes.push({
    ref: drawingDoc(drawingId),
    data: {
      ownerId: uid,
      memberIds: [uid],
      title: `${source.title} copy`,
      description: source.description,
      coverThumbUrl: null,
      pageCount: pagesSnapshot.size,
      elementCount: source.elementCount,
      lastPageId: firstPageId,
      isDeleted: false,
      deletedAt: null,
      schemaVersion: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    mode: "set",
  });

  for (const pageSnapshot of pagesSnapshot.docs) {
    const page = pageSnapshot.data() as Page;
    const newPageId = firstPage ? firstPageId : newId();
    firstPage = false;

    writes.push({
      ref: pageDoc(drawingId, newPageId),
      data: {
        drawingId,
        name: page.name,
        order: page.order,
        width: page.width,
        height: page.height,
        background: page.background,
        thumbnailUrl: null,
        elementCount: page.elementCount,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: uid,
      },
      mode: "set",
    });

    const elementsSnapshot = await getDocs(
      elementsRawCol(source.id, pageSnapshot.id)
    );

    for (const elementSnapshot of elementsSnapshot.docs) {
      const element = elementSnapshot.data() as BoardElement;
      let copy = preparedElement(element, uid, now);

      if (copy.type === "image") {
        const mapped = imageIdMap.get(copy.imageId);
        if (!mapped) continue;
        copy = { ...copy, imageId: mapped };
        imageUsage.set(mapped, (imageUsage.get(mapped) ?? 0) + 1);
      }

      writes.push({
        ref: elementDoc(drawingId, newPageId, newId()),
        data: elementPayload(copy),
        mode: "set",
      });
    }
  }

  for (const [newImageId, write] of imageWritesById) {
    write.data = {
      ...write.data,
      refCount: imageUsage.get(newImageId) ?? 0,
    };
  }

  // The drawing must exist before image/page/element rules can read it.
  const drawingWrite = writes.shift();
  if (!drawingWrite) throw new Error("Could not prepare the drawing copy");
  await commitWrites([drawingWrite]);
  await commitWrites([...writes, ...imageWrites]);

  return { drawingId, pageId: firstPageId };
}
