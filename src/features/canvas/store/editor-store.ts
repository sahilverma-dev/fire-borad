import type { Editor, Shape } from "@dgmjs/core";
import { create } from "zustand";

export type SaveStatus = "idle" | "saved" | "dirty" | "saving" | "error";

interface EditorState {
  editor: Editor | null;
  pageId: string | null;
  selection: Shape[];
  activeHandler: string;
  activeHandlerLock: boolean;
  scale: number;
  showGrid: boolean;
  snapToGrid: boolean;
  snapToObjects: boolean;
  status: SaveStatus;
  error: string | null;
  revision: number;
  canUndo: boolean;
  canRedo: boolean;
  flush: (() => Promise<void>) | null;

  setEditor: (editor: Editor, pageId: string) => void;
  clearEditor: () => void;
  setSelection: (selection: Shape[]) => void;
  setActiveHandler: (handlerId: string) => void;
  setActiveHandlerLock: (lock: boolean) => void;
  setScale: (scale: number) => void;
  setShowGrid: (showGrid: boolean) => void;
  setSnapToGrid: (snapToGrid: boolean) => void;
  setSnapToObjects: (snapToObjects: boolean) => void;
  setFlush: (flush: (() => Promise<void>) | null) => void;

  markDirty: () => void;
  markSaving: () => void;
  markSaved: () => void;
  markError: (message: string) => void;
  setStatus: (status: SaveStatus) => void;
  setError: (error: string | null) => void;
  refreshHistory: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  editor: null,
  pageId: null,
  selection: [],
  activeHandler: "Select",
  activeHandlerLock: false,
  scale: 1,
  showGrid: true,
  snapToGrid: false,
  snapToObjects: false,
  status: "idle",
  error: null,
  revision: 0,
  canUndo: false,
  canRedo: false,
  flush: null,

  setEditor: (editor, pageId) =>
    set({
      editor,
      pageId,
      selection: [],
      activeHandler: editor.getActiveHandler()?.id ?? "Select",
      activeHandlerLock: editor.getActiveHandlerLock(),
      scale: editor.getScale(),
      showGrid: editor.getShowGrid(),
      snapToGrid: editor.getSnapToGrid(),
      snapToObjects: editor.getSnapToObjects(),
      status: "saved",
      error: null,
      revision: 0,
      canUndo: editor.transform.undoHistory.size() > 0,
      canRedo: editor.transform.redoHistory.size() > 0,
    }),

  clearEditor: () =>
    set({
      editor: null,
      pageId: null,
      selection: [],
      status: "idle",
      error: null,
      flush: null,
      canUndo: false,
      canRedo: false,
    }),

  setSelection: (selection) => set({ selection }),
  setActiveHandler: (activeHandler) => set({ activeHandler }),
  setActiveHandlerLock: (activeHandlerLock) => set({ activeHandlerLock }),
  setScale: (scale) => set({ scale }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setSnapToObjects: (snapToObjects) => set({ snapToObjects }),
  setFlush: (flush) => set({ flush }),

  markDirty: () =>
    set((state) => ({
      revision: state.revision + 1,
      status: "dirty",
      error: null,
    })),
  markSaving: () => set({ status: "saving", error: null }),
  markSaved: () => set({ status: "saved", error: null }),
  markError: (message) => set({ status: "error", error: message }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),

  refreshHistory: () => {
    const editor = get().editor;
    if (!editor) return;
    set({
      canUndo: editor.transform.undoHistory.size() > 0,
      canRedo: editor.transform.redoHistory.size() > 0,
    });
  },
}));
