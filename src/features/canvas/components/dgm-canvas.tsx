import { DGMEditor } from "@dgmjs/react";
import {
  basicSetup,
  HorzAlign,
  type Editor,
  type Shape,
  type Text as DGMText,
} from "@dgmjs/core";
import { useEffect, useMemo, useRef, useState } from "react";

import { useDgmAutosave } from "@/features/canvas/hooks/use-autosave";
import {
  loadPageIntoEditor,
  type ShapeSnapshot,
} from "@/features/canvas/lib/dgm";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { usePageThumbnail } from "@/features/pages/hooks/use-page-thumbnail";
import { useTheme } from "@/components/providers/theme-provider";
import type {
  ImageAsset,
  Page,
  ShapeRecord,
} from "@/types/models";

interface DgmCanvasProps {
  uid: string;
  drawingId: string;
  page: Page;
  records: ShapeRecord[];
  images: Map<string, ImageAsset>;
  isFirstPage: boolean;
  persist?: boolean;
  onRequestImage: () => void;
  onDropFiles: (files: File[]) => void;
}

function useIsDark() {
  const { theme } = useTheme();
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemDark(query.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  if (theme === "dark") return true;
  if (theme === "light") return false;
  return systemDark;
}

export function DgmCanvas({
  uid,
  drawingId,
  page,
  records,
  images,
  isFirstPage,
  persist = true,
  onRequestImage,
  onDropFiles,
}: DgmCanvasProps) {
  const dark = useIsDark();
  const [ready, setReady] = useState(false);
  const snapshotRef = useRef<ShapeSnapshot | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const resizeFrame = useRef<number | null>(null);
  const cleanupTimer = useRef<number | null>(null);

  const showGrid = useEditorStore((state) => state.showGrid);
  const snapToGrid = useEditorStore((state) => state.snapToGrid);
  const snapToObjects = useEditorStore((state) => state.snapToObjects);
  const setEditor = useEditorStore((state) => state.setEditor);
  const clearEditor = useEditorStore((state) => state.clearEditor);
  const setSelection = useEditorStore((state) => state.setSelection);
  const setActiveHandler = useEditorStore((state) => state.setActiveHandler);
  const setActiveHandlerLock = useEditorStore(
    (state) => state.setActiveHandlerLock
  );
  const setScale = useEditorStore((state) => state.setScale);
  const markDirty = useEditorStore((state) => state.markDirty);
  const refreshHistory = useEditorStore((state) => state.refreshHistory);

  useDgmAutosave({
    uid,
    drawingId,
    pageId: page.id,
    enabled: ready && persist,
    snapshotRef,
    images,
  });

  usePageThumbnail({
    drawingId,
    isFirstPage,
    enabled: ready && persist,
  });

  const options = useMemo(() => {
    const base = basicSetup();
    const keymap = {
      ...base.keymap,
      v: (editor: Editor) => editor.activateDefaultHandler(),
      h: (editor: Editor) => editor.activateHandler("Hand"),
      r: (editor: Editor) => editor.activateHandler("Rectangle"),
      o: (editor: Editor) => editor.activateHandler("Ellipse"),
      t: (editor: Editor) => editor.activateHandler("Text"),
      l: (editor: Editor) => editor.activateHandler("Line"),
      c: (editor: Editor) => editor.activateHandler("Connector"),
      p: (editor: Editor) => editor.activateHandler("Freehand"),
      e: (editor: Editor) => editor.activateHandler("Eraser"),
      i: () => onRequestImage(),
      "mod-s": (editor: Editor) => {
        void useEditorStore.getState().flush?.();
        editor.repaint();
      },
    };

    return {
      ...base,
      keymap,
      showDOM: true,
      imageResize: {
        quality: 1,
        maxWidth: 2800,
        maxHeight: 2800,
      },
      canvasColor: page.background.color || "#ffffff",
    };
  }, [onRequestImage, page.background.color]);

  const handleMount = (editor: Editor) => {
    editorRef.current = editor;
    const loaded = loadPageIntoEditor({
      editor,
      page,
      records,
      images,
    });
    snapshotRef.current = loaded.snapshot;
    setEditor(editor, page.id);
    setReady(true);

    if (persist && records.some((record) => record.legacy)) {
      // Force the first autosave so legacy element documents are rewritten in
      // the dgmjs format without waiting for the user to edit something.
      markDirty();
    }

    const holder = editor.parent;
    if (holder && typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        if (resizeFrame.current) {
          window.cancelAnimationFrame(resizeFrame.current);
        }
        resizeFrame.current = window.requestAnimationFrame(() => {
          resizeFrame.current = null;
          editor.fit();
          editor.repaint();
        });
      });
      observer.observe(holder);
      (editor as Editor & { __resizeObserver?: ResizeObserver }).__resizeObserver =
        observer;
    }
  };

  useEffect(() => {
    if (cleanupTimer.current) {
      window.clearTimeout(cleanupTimer.current);
      cleanupTimer.current = null;
    }

    return () => {
      const editor = editorRef.current as
        | (Editor & { __resizeObserver?: ResizeObserver })
        | null;
      cleanupTimer.current = window.setTimeout(() => {
        cleanupTimer.current = null;
        editor?.__resizeObserver?.disconnect();
        editor?.setEnabled(false);
        if (resizeFrame.current) {
          window.cancelAnimationFrame(resizeFrame.current);
          resizeFrame.current = null;
        }
        if (useEditorStore.getState().editor === editor) {
          clearEditor();
        }
      }, 0);
    };
  }, [clearEditor]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event as KeyboardEvent & { __dgmForwarded?: boolean }).__dgmForwarded) {
        return;
      }
      const editor = editorRef.current;
      if (!editor || !editor.getEnabled()) return;

      if (
        document.querySelector(
          "[role='menu'],[role='dialog'],[role='listbox'],[role='combobox']"
        )
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.getAttribute("contenteditable") === "true" ||
          Boolean(
            target.closest(
              "[role='menu'],[role='dialog'],[role='listbox'],[role='combobox']"
            )
          ))
      ) {
        return;
      }

      const clone = new KeyboardEvent("keydown", {
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(clone, "keyCode", { get: () => event.keyCode });
      Object.defineProperty(clone, "which", { get: () => event.which });
      (clone as KeyboardEvent & { __dgmForwarded?: boolean }).__dgmForwarded =
        true;

      editor.canvasElement.dispatchEvent(clone);
      if (clone.defaultPrevented) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleShapeCreate = (shape: Shape) => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!editor.getActiveHandlerLock()) {
      window.setTimeout(() => {
        if (!editor.store.has(shape)) return;
        editor.selection.select([shape]);
        editor.repaint();
      }, 0);
    }
  };

  const handleShapeInitialize = (shape: Shape) => {
    if (
      shape.type === "Rectangle" ||
      shape.type === "Ellipse" ||
      shape.type === "Line" ||
      shape.type === "Connector" ||
      shape.type === "Freehand" ||
      shape.type === "Highlighter"
    ) {
      shape.roughness = 1;
      if (shape.strokeWidth < 2) shape.strokeWidth = 2;
    }
    if (shape.type === "Text") {
      const text = shape as DGMText;
      text.fontFamily = "Gloria Hallelujah";
      text.horzAlign = HorzAlign.LEFT;
    }
  };

  return (
    <DGMEditor
      className="absolute inset-0 h-full w-full outline-none"
      options={options}
      darkMode={dark}
      showGrid={showGrid}
      snapToGrid={snapToGrid}
      snapToObjects={snapToObjects}
      onMount={handleMount}
      onSelectionChange={(selection) => setSelection([...selection])}
      onActiveHandlerChange={(handlerId) => {
        setActiveHandler(handlerId);
        editorRef.current?.selection.deselectAll();
        editorRef.current?.focus();
      }}
      onActiveHandlerLockChange={setActiveHandlerLock}
      onZoom={setScale}
      onShapeCreate={handleShapeCreate}
      onShapeInitialize={handleShapeInitialize}
      onAction={() => {
        markDirty();
        refreshHistory();
      }}
      onUndo={() => {
        markDirty();
        refreshHistory();
      }}
      onRedo={() => {
        markDirty();
        refreshHistory();
      }}
      onFileDrop={({ dataTransfer }) => {
        const files = Array.from(dataTransfer.files ?? []);
        if (files.length) onDropFiles(files);
      }}
    />
  );
}
