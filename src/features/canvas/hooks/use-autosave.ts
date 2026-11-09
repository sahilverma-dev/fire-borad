import { increment, serverTimestamp } from "firebase/firestore";
import { useCallback, useEffect, useRef } from "react";

import { elementRef } from "@/features/canvas/api/shapes";
import {
  countImageUsage,
  DGM_SCHEMA_VERSION,
  pageShapes,
  serializeShapeTree,
  stableStringify,
  type ShapeSnapshot,
} from "@/features/canvas/lib/dgm";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { adjustImageUsage } from "@/features/images/api";
import { friendlyFirestoreError } from "@/lib/firebase/errors";
import { commitWrites, type PendingWrite } from "@/lib/firestore/batch";
import { drawingDoc, pageDoc } from "@/lib/firestore/paths";
import type { MutableRefObject } from "react";

import type { ImageAsset } from "@/types/models";

const AUTOSAVE_DELAY = 700;

export function useDgmAutosave(options: {
  uid: string;
  drawingId: string;
  pageId: string;
  enabled: boolean;
  snapshotRef: MutableRefObject<ShapeSnapshot | null>;
  images: Map<string, ImageAsset>;
}) {
  const { uid, drawingId, pageId, enabled, snapshotRef, images } = options;
  const revision = useEditorStore((state) => state.revision);
  const status = useEditorStore((state) => state.status);

  const timer = useRef<number | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const previousCount = useRef<number | null>(null);
  const imageUsage = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    const editor = useEditorStore.getState().editor;
    const page = editor?.getCurrentPage();
    if (!page) return;
    previousCount.current = pageShapes(page).length;
    imageUsage.current = countImageUsage(page);
  }, [enabled, pageId]);

  const resolveImageId = useCallback(
    (dataUrl: string) => {
      for (const asset of images.values()) {
        if (asset.url === dataUrl) return asset.id;
      }
      return undefined;
    },
    [images]
  );

  const runFlush = useCallback(async () => {
    const state = useEditorStore.getState();
    const editor = state.editor;
    if (!editor || state.pageId !== pageId) return;

    const page = editor.getCurrentPage();
    const snapshot = snapshotRef.current;
    if (!page || !snapshot) return;

    const startRevision = state.revision;
    const shapes = pageShapes(page);
    const writes: PendingWrite[] = [];
    const nextSnapshot: ShapeSnapshot = {};

    for (let index = 0; index < shapes.length; index += 1) {
      const shape = shapes[index];
      const { shape: json, imageIds } = serializeShapeTree(
        shape,
        resolveImageId
      );
      const jsonKey = stableStringify(json);
      const imageIdsKey = stableStringify(imageIds);

      nextSnapshot[shape.id] = {
        index,
        json: jsonKey,
        imageIds: imageIdsKey,
      };

      const previous = snapshot[shape.id];
      if (
        previous &&
        previous.index === index &&
        previous.json === jsonKey &&
        previous.imageIds === imageIdsKey
      ) {
        continue;
      }

      const data: Record<string, unknown> = {
        index,
        shape: json,
        imageIds,
        updatedAt: serverTimestamp(),
      };
      if (!previous) {
        data.createdBy = uid;
        data.createdAt = serverTimestamp();
      }

      writes.push({
        ref: elementRef(drawingId, pageId, shape.id),
        data,
        mode: previous ? "set" : "replace",
      });
    }

    const currentIds = new Set(shapes.map((shape) => shape.id));
    for (const id of Object.keys(snapshot)) {
      if (!currentIds.has(id)) {
        writes.push({
          ref: elementRef(drawingId, pageId, id),
          mode: "delete",
        });
      }
    }

    const count = shapes.length;
    const previousTotal = previousCount.current ?? count;
    const delta = count - previousTotal;

    writes.push({
      ref: pageDoc(drawingId, pageId),
      data: {
        elementCount: count,
        schemaVersion: DGM_SCHEMA_VERSION,
        pageScale: editor.getScale(),
        pageOrigin: editor.getOrigin(),
        updatedAt: serverTimestamp(),
      },
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

    state.markSaving();

    try {
      await commitWrites(writes);

      snapshotRef.current = nextSnapshot;
      previousCount.current = count;

      const currentUsage = countImageUsage(page);
      const imageIds = new Set([
        ...imageUsage.current.keys(),
        ...currentUsage.keys(),
      ]);
      for (const imageId of imageIds) {
        const before = imageUsage.current.get(imageId) ?? 0;
        const after = currentUsage.get(imageId) ?? 0;
        if (before === after) continue;
        try {
          await adjustImageUsage(drawingId, imageId, after - before);
        } catch {
          // Retried on the next save; the shape write already succeeded.
        }
      }
      imageUsage.current = currentUsage;

      const latest = useEditorStore.getState();
      if (latest.pageId !== pageId) return;
      if (latest.revision === startRevision) {
        latest.markSaved();
      } else {
        latest.setStatus("dirty");
      }
    } catch (error) {
      const latest = useEditorStore.getState();
      if (latest.pageId === pageId) {
        latest.markError(friendlyFirestoreError(error));
      }
    }
  }, [drawingId, pageId, snapshotRef, uid, resolveImageId]);

  const flush = useCallback(async () => {
    if (!enabled) return;

    if (inFlight.current) {
      await inFlight.current;
    }

    if (!enabled) return;

    const state = useEditorStore.getState();
    if (state.pageId !== pageId || !state.editor) return;
    if (state.status === "saved") return;

    const promise = runFlush();
    inFlight.current = promise;
    try {
      await promise;
    } finally {
      if (inFlight.current === promise) inFlight.current = null;
    }
  }, [enabled, pageId, runFlush]);

  useEffect(() => {
    if (!enabled) return;
    useEditorStore.getState().setFlush(flush);
    return () => {
      useEditorStore.getState().setFlush(null);
    };
  }, [enabled, flush]);

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
    if (!enabled) return;
    const onHidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, [enabled, flush]);

  useEffect(() => {
    return () => {
      void flush();
    };
  }, [flush]);

  return { flush };
}
