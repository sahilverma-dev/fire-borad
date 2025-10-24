import { increment, serverTimestamp } from "firebase/firestore";
import { useCallback, useEffect, useRef } from "react";

import { elementRef, elementToDocument } from "@/features/canvas/api/elements";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { adjustImageUsage } from "@/features/images/api";
import { friendlyFirestoreError } from "@/lib/firebase/errors";
import { commitWrites, type PendingWrite } from "@/lib/firestore/batch";
import { drawingDoc, pageDoc } from "@/lib/firestore/paths";
import type { BoardElement } from "@/types/models";

const AUTOSAVE_DELAY = 700;

function countImages(
  elements: Record<string, BoardElement>
): Map<string, number> {
  const usage = new Map<string, number>();
  for (const element of Object.values(elements)) {
    if (element.type !== "image") continue;
    usage.set(element.imageId, (usage.get(element.imageId) ?? 0) + 1);
  }
  return usage;
}

export function useAutosave(
  drawingId: string,
  pageId: string,
  enabled: boolean
) {
  const status = useEditorStore((state) => state.status);
  const revision = useEditorStore((state) => state.revision);

  const timer = useRef<number | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const imageUsage = useRef<Map<string, number>>(new Map());
  const imageUsageReady = useRef(false);
  const previousCount = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const elements = useEditorStore.getState().elements;
    imageUsage.current = countImages(elements);
    imageUsageReady.current = true;
    previousCount.current = Object.keys(elements).length;
  }, [enabled, pageId]);

  const runFlush = useCallback(async () => {
    const state = useEditorStore.getState();
    if (state.page?.id !== pageId) return;

    const dirty = state.dirty;
    const deleted = state.deleted;
    if (!Object.keys(dirty).length && !Object.keys(deleted).length) return;

    state.setStatus("saving");
    state.setError(null);

    const writes: PendingWrite[] = [];

    for (const id of Object.keys(dirty)) {
      const element = state.elements[id];
      if (!element) continue;
      writes.push({
        ref: elementRef(drawingId, pageId, id),
        data: elementToDocument(element),
        mode: "set",
      });
    }

    for (const id of Object.keys(deleted)) {
      writes.push({
        ref: elementRef(drawingId, pageId, id),
        mode: "delete",
      });
    }

    const count = Object.keys(state.elements).length;
    const delta =
      previousCount.current === null ? 0 : count - previousCount.current;

    writes.push({
      ref: pageDoc(drawingId, pageId),
      data: { elementCount: count, updatedAt: serverTimestamp() },
      mode: "update",
    });
    writes.push({
      ref: drawingDoc(drawingId),
      data: {
        elementCount: increment(delta),
        updatedAt: serverTimestamp(),
      },
      mode: "update",
    });

    try {
      await commitWrites(writes);
      previousCount.current = count;
      useEditorStore.getState().markSaved(dirty, deleted);

      if (imageUsageReady.current) {
        const current = countImages(useEditorStore.getState().elements);
        const imageIds = new Set([
          ...imageUsage.current.keys(),
          ...current.keys(),
        ]);
        for (const imageId of imageIds) {
          const before = imageUsage.current.get(imageId) ?? 0;
          const after = current.get(imageId) ?? 0;
          if (before === after) continue;
          try {
            await adjustImageUsage(drawingId, imageId, after - before);
            imageUsage.current.set(imageId, after);
          } catch {
            // Retried on the next save; the element write already succeeded.
          }
        }
      }
    } catch (error) {
      useEditorStore.getState().setStatus("error");
      useEditorStore.getState().setError(friendlyFirestoreError(error));
    }
  }, [drawingId, pageId]);

  const flush = useCallback(async () => {
    if (!enabled) return;

    // Wait for any save already on the wire so page switches never drop the
    // most recent edits.
    if (inFlight.current) {
      await inFlight.current;
    }

    if (!enabled) return;

    const state = useEditorStore.getState();
    if (state.page?.id !== pageId) return;
    if (!Object.keys(state.dirty).length && !Object.keys(state.deleted).length) {
      return;
    }

    const promise = runFlush();
    inFlight.current = promise;
    try {
      await promise;
    } finally {
      if (inFlight.current === promise) inFlight.current = null;
    }
  }, [enabled, pageId, runFlush]);

  useEffect(() => {
    if (!enabled || status !== "dirty") return;

    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      void flush();
    }, AUTOSAVE_DELAY);

    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [revision, status, enabled, flush]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, [flush]);

  useEffect(() => {
    return () => {
      void flush();
    };
  }, [flush]);

  return { flush };
}
