import {
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { elementDoc, elementsRawCol } from "@/lib/firestore/paths";
import type { BoardElement } from "@/types/models";

const MAX_ELEMENTS_PER_PAGE = 2000;

function toElement(id: string, data: Record<string, unknown>): BoardElement {
  const toDate = (value: unknown, fallback: Date) =>
    value && typeof (value as Timestamp).toDate === "function"
      ? (value as Timestamp).toDate()
      : fallback;

  return {
    ...(data as unknown as BoardElement),
    id,
    createdAt: toDate(data.createdAt, new Date()),
    updatedAt: toDate(data.updatedAt, new Date()),
  };
}

export async function fetchElements(
  drawingId: string,
  pageId: string
): Promise<BoardElement[]> {
  const snapshot = await getDocs(
    query(
      elementsRawCol(drawingId, pageId),
      orderBy("order"),
      limit(MAX_ELEMENTS_PER_PAGE)
    )
  );
  return snapshot.docs.map((document) =>
    toElement(document.id, document.data())
  );
}

export function elementToDocument(
  element: BoardElement
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...element };
  delete payload.id;
  payload.createdAt =
    element.createdAt instanceof Date
      ? Timestamp.fromDate(element.createdAt)
      : element.createdAt;
  payload.updatedAt = serverTimestamp();
  return payload;
}

export function elementRef(
  drawingId: string,
  pageId: string,
  elementId: string
) {
  return elementDoc(drawingId, pageId, elementId);
}
