import { getDocs, Timestamp } from "firebase/firestore";

import { elementDoc, elementsRawCol } from "@/lib/firestore/paths";
import type { ShapeRecord } from "@/types/models";

function toDate(value: unknown): Date | null {
  if (value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  return null;
}

/**
 * Reads every document in a page's element collection. New (dgmjs) documents
 * carry a `shape` object; legacy documents carry the old BoardElement fields
 * directly on the document.
 */
export async function fetchPageShapeRecords(
  drawingId: string,
  pageId: string
): Promise<ShapeRecord[]> {
  const snapshot = await getDocs(elementsRawCol(drawingId, pageId));

  const records = snapshot.docs.map((document) => {
    const data = document.data() as Record<string, unknown>;
    const shape =
      data.shape && typeof data.shape === "object"
        ? (data.shape as Record<string, unknown>)
        : undefined;

    return {
      id: document.id,
      shape,
      imageIds:
        data.imageIds && typeof data.imageIds === "object"
          ? (data.imageIds as Record<string, string>)
          : {},
      index: typeof data.index === "number" ? data.index : undefined,
      legacy: !shape,
      legacyData: shape ? undefined : data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      createdBy: typeof data.createdBy === "string" ? data.createdBy : undefined,
    } satisfies ShapeRecord;
  });

  records.sort((a, b) => {
    if (!a.legacy && !b.legacy) {
      return (a.index ?? 0) - (b.index ?? 0);
    }
    if (a.legacy && b.legacy) {
      const aOrder = String(a.legacyData?.order ?? "");
      const bOrder = String(b.legacyData?.order ?? "");
      return aOrder.localeCompare(bOrder);
    }
    return a.legacy ? 1 : -1;
  });

  return records;
}

export function elementRef(
  drawingId: string,
  pageId: string,
  elementId: string
) {
  return elementDoc(drawingId, pageId, elementId);
}

export type { ShapeRecord };
