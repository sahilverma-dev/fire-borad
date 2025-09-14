import { create } from "zustand";

import type { BoardElement, Page, Tool } from "@/types/models";

export type SaveStatus = "idle" | "saved" | "dirty" | "saving" | "error";

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export type ElementPatch = Partial<BoardElement>;

interface EditorState {
  page: Page | null;
  elements: Record<string, BoardElement>;
  selectedIds: string[];
  tool: Tool;
  viewport: Viewport;
  status: SaveStatus;
  error: string | null;
  revision: number;
  dirty: Record<string, number>;
  deleted: Record<string, number>;
  past: Record<string, BoardElement>[];
  future: Record<string, BoardElement>[];

  hydrate: (page: Page, elements: BoardElement[]) => void;
  reset: () => void;

  setTool: (tool: Tool) => void;
  setViewport: (viewport: Viewport) => void;
  setStatus: (status: SaveStatus) => void;
  setError: (error: string | null) => void;

  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  addElement: (element: BoardElement) => void;
  addElements: (elements: BoardElement[]) => void;
  updateElement: (
    id: string,
    patch: ElementPatch,
    recordHistory?: boolean
  ) => void;
  updateElements: (
    patches: { id: string; patch: ElementPatch }[],
    recordHistory?: boolean
  ) => void;
  removeElements: (ids: string[]) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  markSaved: (
    dirty: Record<string, number>,
    deleted: Record<string, number>
  ) => void;
}

function isDifferent(
  before: BoardElement | undefined,
  after: BoardElement
): boolean {
  if (!before) return true;
  return (
    before.x !== after.x ||
    before.y !== after.y ||
    before.w !== after.w ||
    before.h !== after.h ||
    before.angle !== after.angle ||
    before.opacity !== after.opacity ||
    before.order !== after.order ||
    before.style !== after.style ||
    JSON.stringify(before) !== JSON.stringify(after)
  );
}

const HISTORY_LIMIT = 60;

function withDirty(
  state: EditorState,
  dirtyIds: string[],
  deletedIds: string[]
): Pick<
  EditorState,
  "revision" | "dirty" | "deleted" | "status" | "error"
> {
  const revision = state.revision + 1;
  const dirty = { ...state.dirty };
  const deleted = { ...state.deleted };

  for (const id of dirtyIds) {
    dirty[id] = revision;
    delete deleted[id];
  }
  for (const id of deletedIds) {
    deleted[id] = revision;
    delete dirty[id];
  }

  return { revision, dirty, deleted, status: "dirty", error: null };
}

function pushPast(
  state: EditorState
): Pick<EditorState, "past" | "future"> {
  return {
    past: [...state.past, state.elements].slice(-HISTORY_LIMIT),
    future: [],
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  page: null,
  elements: {},
  selectedIds: [],
  tool: "select",
  viewport: { x: 0, y: 0, zoom: 1 },
  status: "idle",
  error: null,
  revision: 0,
  dirty: {},
  deleted: {},
  past: [],
  future: [],

  hydrate: (page, elements) =>
    set({
      page,
      elements: Object.fromEntries(
        elements.map((element) => [element.id, element])
      ),
      selectedIds: [],
      tool: "select",
      status: "saved",
      error: null,
      revision: 0,
      dirty: {},
      deleted: {},
      past: [],
      future: [],
    }),

  reset: () =>
    set({
      page: null,
      elements: {},
      selectedIds: [],
      status: "idle",
      error: null,
      revision: 0,
      dirty: {},
      deleted: {},
      past: [],
      future: [],
    }),

  setTool: (tool) => set({ tool, selectedIds: tool === "select" ? get().selectedIds : [] }),
  setViewport: (viewport) => set({ viewport }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),

  select: (ids) => set({ selectedIds: ids }),
  toggleSelect: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((selected) => selected !== id)
        : [...state.selectedIds, id],
    })),
  clearSelection: () => set({ selectedIds: [] }),

  addElement: (element) =>
    set((state) => ({
      ...pushPast(state),
      elements: { ...state.elements, [element.id]: element },
      selectedIds: [element.id],
      ...withDirty(state, [element.id], []),
    })),

  addElements: (newElements) =>
    set((state) => {
      if (!newElements.length) return state;
      const elements = { ...state.elements };
      for (const element of newElements) {
        elements[element.id] = element;
      }
      return {
        ...pushPast(state),
        elements,
        selectedIds: newElements.map((element) => element.id),
        ...withDirty(
          state,
          newElements.map((element) => element.id),
          []
        ),
      };
    }),

  updateElement: (id, patch, recordHistory = false) =>
    set((state) => {
      const current = state.elements[id];
      if (!current) return state;
      return {
        ...(recordHistory ? pushPast(state) : {}),
        elements: {
          ...state.elements,
          [id]: { ...current, ...patch, id } as BoardElement,
        },
        ...withDirty(state, [id], []),
      };
    }),

  updateElements: (patches, recordHistory = false) =>
    set((state) => {
      if (!patches.length) return state;
      const elements = { ...state.elements };
      for (const { id, patch } of patches) {
        const current = elements[id];
        if (!current) continue;
        elements[id] = { ...current, ...patch, id } as BoardElement;
      }
      return {
        ...(recordHistory ? pushPast(state) : {}),
        elements,
        ...withDirty(
          state,
          patches.map((entry) => entry.id),
          []
        ),
      };
    }),

  removeElements: (ids) =>
    set((state) => {
      if (!ids.length) return state;
      const elements = { ...state.elements };
      for (const id of ids) delete elements[id];
      return {
        ...pushPast(state),
        elements,
        selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
        ...withDirty(state, [], ids),
      };
    }),

  pushHistory: () => set((state) => pushPast(state)),

  undo: () =>
    set((state) => {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      const currentIds = Object.keys(state.elements);
      const previousIds = Object.keys(previous);
      const removed = currentIds.filter((id) => !previous[id]);
      const dirtyIds = previousIds.filter((id) => {
        const before = previous[id];
        return isDifferent(state.elements[id], before);
      });

      return {
        elements: previous,
        past: state.past.slice(0, -1),
        future: [state.elements, ...state.future].slice(0, HISTORY_LIMIT),
        selectedIds: state.selectedIds.filter((id) => previous[id]),
        ...withDirty(state, dirtyIds, removed),
      };
    }),

  redo: () =>
    set((state) => {
      if (!state.future.length) return state;
      const next = state.future[0];
      const currentIds = Object.keys(state.elements);
      const nextIds = Object.keys(next);
      const removed = currentIds.filter((id) => !next[id]);
      const dirtyIds = nextIds.filter((id) => {
        const after = next[id];
        return isDifferent(state.elements[id], after);
      });

      return {
        elements: next,
        past: [...state.past, state.elements].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        selectedIds: state.selectedIds.filter((id) => next[id]),
        ...withDirty(state, dirtyIds, removed),
      };
    }),

  markSaved: (dirty, deleted) =>
    set((state) => {
      const nextDirty = { ...state.dirty };
      const nextDeleted = { ...state.deleted };

      for (const [id, revision] of Object.entries(dirty)) {
        if (nextDirty[id] === revision) delete nextDirty[id];
      }
      for (const [id, revision] of Object.entries(deleted)) {
        if (nextDeleted[id] === revision) delete nextDeleted[id];
      }

      const hasPending =
        Object.keys(nextDirty).length > 0 ||
        Object.keys(nextDeleted).length > 0;

      return {
        dirty: nextDirty,
        deleted: nextDeleted,
        status: hasPending ? "dirty" : "saved",
      };
    }),
}));
