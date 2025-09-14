import {
  Maximize2,
  Minus,
  Plus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { CanvasElement } from "@/features/canvas/components/canvas-element";
import {
  boundsOfPoints,
  clamp,
  distance,
  normalizeRect,
  styleForType,
} from "@/features/canvas/lib/defaults";
import {
  type Viewport,
  useEditorStore,
} from "@/features/canvas/store/editor-store";
import { newId } from "@/lib/id";
import { orderAtEnd, orderBetween } from "@/lib/firestore/fractional";
import type {
  BoardElement,
  ElementType,
  ImageAsset,
  Page,
  Point,
  Tool,
} from "@/types/models";

type Handle = "nw" | "ne" | "sw" | "se";

type DragState =
  | {
      type: "move";
      start: Point;
      origins: Record<string, { x: number; y: number }>;
      moved: boolean;
    }
  | { type: "resize"; handle: Handle; start: Point; origin: BoardElement }
  | { type: "draw"; start: Point; id: string; kind: Tool }
  | { type: "marquee"; start: Point; additive: boolean }
  | { type: "pan"; startClient: Point; originViewport: Viewport };

interface CanvasProps {
  uid: string;
  page: Page;
  imagesById: Map<string, ImageAsset>;
  onRequestImage: () => void;
  onDropFiles: (files: File[]) => void;
}

function elementBounds(element: BoardElement) {
  if (element.type === "line" || element.type === "arrow") {
    return {
      x: Math.min(element.x, element.x + element.w),
      y: Math.min(element.y, element.y + element.h),
      w: Math.abs(element.w),
      h: Math.abs(element.h),
    };
  }
  return { x: element.x, y: element.y, w: element.w, h: element.h };
}

function intersects(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

const SHORTCUT_TOOLS: Record<string, Tool> = {
  v: "select",
  h: "hand",
  r: "rect",
  o: "ellipse",
  a: "arrow",
  l: "line",
  t: "text",
  p: "pen",
  e: "eraser",
};

export function Canvas({
  uid,
  page,
  imagesById,
  onRequestImage,
  onDropFiles,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const spaceRef = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<ReturnType<typeof normalizeRect> | null>(
    null
  );
  const [dragOver, setDragOver] = useState(false);

  const elements = useEditorStore((state) => state.elements);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const tool = useEditorStore((state) => state.tool);
  const viewport = useEditorStore((state) => state.viewport);
  const setViewport = useEditorStore((state) => state.setViewport);
  const setTool = useEditorStore((state) => state.setTool);
  const select = useEditorStore((state) => state.select);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const addElement = useEditorStore((state) => state.addElement);
  const addElements = useEditorStore((state) => state.addElements);
  const updateElement = useEditorStore((state) => state.updateElement);
  const updateElements = useEditorStore((state) => state.updateElements);
  const removeElements = useEditorStore((state) => state.removeElements);
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  const sortedElements = useMemo(
    () =>
      Object.values(elements).sort((a, b) => a.order.localeCompare(b.order)),
    [elements]
  );

  const selectedElements = selectedIds
    .map((id) => elements[id])
    .filter((element): element is BoardElement => Boolean(element));

  const editingElement =
    editingId && elements[editingId]?.type === "text"
      ? (elements[editingId] as Extract<BoardElement, { type: "text" }>)
      : null;

  const fitToPage = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const zoom = clamp(
      Math.min(
        (rect.width - 96) / page.width,
        (rect.height - 96) / page.height
      ),
      0.1,
      2
    );
    setViewport({
      zoom,
      x: (rect.width - page.width * zoom) / 2,
      y: (rect.height - page.height * zoom) / 2,
    });
  }, [page.height, page.width, setViewport]);

  useEffect(() => {
    fitToPage();
  }, [fitToPage, page.id]);

  const toWorld = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const current = useEditorStore.getState().viewport;
    return {
      x: (clientX - rect.left - current.x) / current.zoom,
      y: (clientY - rect.top - current.y) / current.zoom,
    };
  }, []);

  const capture = (pointerId: number) => {
    svgRef.current?.setPointerCapture(pointerId);
  };

  const buildElement = useCallback(
    (kind: Tool, point: Point): BoardElement | null => {
      const orders = Object.values(useEditorStore.getState().elements).map(
        (element) => element.order
      );
      const base = {
        id: newId(),
        order: orderAtEnd(orders),
        angle: 0,
        opacity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: uid,
      };

      switch (kind) {
        case "rect":
        case "ellipse":
        case "line":
        case "arrow":
          return {
            ...base,
            type: kind as ElementType,
            x: point.x,
            y: point.y,
            w: 0,
            h: 0,
            style: styleForType(kind as ElementType),
          } as BoardElement;
        case "text":
          return {
            ...base,
            type: "text",
            x: point.x,
            y: point.y,
            w: 280,
            h: 40,
            text: "Text",
            style: styleForType("text"),
          };
        case "pen":
          return {
            ...base,
            type: "freehand",
            x: point.x,
            y: point.y,
            w: 0,
            h: 0,
            points: [point],
            style: styleForType("freehand"),
          };
        default:
          return null;
      }
    },
    [uid]
  );

  const beginDraw = useCallback(
    (kind: Tool, point: Point, pointerId: number) => {
      const element = buildElement(kind, point);
      if (!element) return;
      addElement(element);
      dragRef.current = { type: "draw", start: point, id: element.id, kind };
      capture(pointerId);
    },
    [addElement, buildElement]
  );

  const beginPan = useCallback((clientX: number, clientY: number, pointerId: number) => {
    dragRef.current = {
      type: "pan",
      startClient: { x: clientX, y: clientY },
      originViewport: useEditorStore.getState().viewport,
    };
    capture(pointerId);
  }, []);

  const handleBackgroundPointerDown = (
    event: ReactPointerEvent<SVGSVGElement>
  ) => {
    if (event.button === 2) return;
    if (event.button === 1 || tool === "hand" || spaceRef.current) {
      event.preventDefault();
      beginPan(event.clientX, event.clientY, event.pointerId);
      return;
    }

    const point = toWorld(event.clientX, event.clientY);

    if (tool === "select") {
      if (!event.shiftKey) clearSelection();
      dragRef.current = {
        type: "marquee",
        start: point,
        additive: event.shiftKey,
      };
      setMarquee({ x: point.x, y: point.y, w: 0, h: 0 });
      capture(event.pointerId);
      return;
    }

    if (tool === "image") {
      onRequestImage();
      return;
    }

    if (tool === "eraser") return;

    if (tool === "text") {
      const element = buildElement("text", point);
      if (!element) return;
      addElement(element);
      setEditingId(element.id);
      return;
    }

    beginDraw(tool, point, event.pointerId);
  };

  const handleElementPointerDown = (
    event: ReactPointerEvent,
    element: BoardElement
  ) => {
    if (event.button === 2) return;
    event.stopPropagation();

    if (tool === "hand" || spaceRef.current) {
      beginPan(event.clientX, event.clientY, event.pointerId);
      return;
    }

    if (tool === "eraser") {
      removeElements([element.id]);
      return;
    }

    if (tool !== "select") {
      const point = toWorld(event.clientX, event.clientY);
      beginDraw(tool, point, event.pointerId);
      return;
    }

    const state = useEditorStore.getState();
    let next = state.selectedIds;

    if (event.shiftKey) {
      next = next.includes(element.id)
        ? next.filter((id) => id !== element.id)
        : [...next, element.id];
    } else if (!next.includes(element.id)) {
      next = [element.id];
    }

    select(next);
    if (!next.includes(element.id)) return;

    pushHistory();
    const origins: Record<string, { x: number; y: number }> = {};
    for (const id of next) {
      const current = state.elements[id];
      if (current) origins[id] = { x: current.x, y: current.y };
    }

    dragRef.current = {
      type: "move",
      start: toWorld(event.clientX, event.clientY),
      origins,
      moved: false,
    };
    capture(event.pointerId);
  };

  const handleResizeStart = (
    event: ReactPointerEvent,
    element: BoardElement,
    handle: Handle
  ) => {
    event.stopPropagation();
    pushHistory();
    dragRef.current = {
      type: "resize",
      handle,
      start: toWorld(event.clientX, event.clientY),
      origin: element,
    };
    capture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.type === "pan") {
      setViewport({
        ...drag.originViewport,
        x: drag.originViewport.x + (event.clientX - drag.startClient.x),
        y: drag.originViewport.y + (event.clientY - drag.startClient.y),
      });
      return;
    }

    const point = toWorld(event.clientX, event.clientY);

    if (drag.type === "marquee") {
      setMarquee(normalizeRect(drag.start, point));
      return;
    }

    if (drag.type === "move") {
      const dx = point.x - drag.start.x;
      const dy = point.y - drag.start.y;
      if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
      updateElements(
        Object.entries(drag.origins).map(([id, origin]) => ({
          id,
          patch: { x: origin.x + dx, y: origin.y + dy },
        }))
      );
      return;
    }

    if (drag.type === "resize") {
      const { origin, handle } = drag;
      const dx = point.x - drag.start.x;
      const dy = point.y - drag.start.y;
      let { x, y, w, h } = origin;

      if (handle.includes("e")) w = Math.max(12, origin.w + dx);
      if (handle.includes("s")) h = Math.max(12, origin.h + dy);
      if (handle.includes("w")) {
        x = origin.x + dx;
        w = Math.max(12, origin.w - dx);
      }
      if (handle.includes("n")) {
        y = origin.y + dy;
        h = Math.max(12, origin.h - dy);
      }

      updateElement(origin.id, { x, y, w, h });
      return;
    }

    if (drag.type === "draw") {
      const current = useEditorStore.getState().elements[drag.id];
      if (!current) return;

      if (drag.kind === "line" || drag.kind === "arrow") {
        updateElement(drag.id, {
          x: drag.start.x,
          y: drag.start.y,
          w: point.x - drag.start.x,
          h: point.y - drag.start.y,
        });
        return;
      }

      if (drag.kind === "pen" && current.type === "freehand") {
        const points = [...current.points, point];
        updateElement(drag.id, { points, ...boundsOfPoints(points) });
        return;
      }

      updateElement(drag.id, normalizeRect(drag.start, point));
    }
  };

  const finishDraw = (drag: Extract<DragState, { type: "draw" }>) => {
    const state = useEditorStore.getState();
    const element = state.elements[drag.id];
    if (!element) return;

    if (element.type === "freehand") {
      if (element.points.length < 2) {
        state.removeElements([element.id]);
      }
      return;
    }

    if (element.type === "line" || element.type === "arrow") {
      if (distance(drag.start, { x: element.x + element.w, y: element.y + element.h }) < 6) {
        state.removeElements([element.id]);
      }
      return;
    }

    if (element.type === "rect" || element.type === "ellipse") {
      if (element.w < 6 || element.h < 6) {
        state.removeElements([element.id]);
      }
      return;
    }

    if (element.type === "text") {
      setEditingId(element.id);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;

    if (drag?.type === "marquee") {
      const rect = normalizeRect(drag.start, toWorld(event.clientX, event.clientY));
      if (rect.w > 2 || rect.h > 2) {
        const hits = Object.values(useEditorStore.getState().elements)
          .filter((element) => intersects(elementBounds(element), rect))
          .map((element) => element.id);
        const current = useEditorStore.getState().selectedIds;
        select(
          drag.additive ? Array.from(new Set([...current, ...hits])) : hits
        );
      }
      setMarquee(null);
    }

    if (drag?.type === "draw") finishDraw(drag);

    dragRef.current = null;
    if (drag) {
      setMarquee(null);
      try {
        svgRef.current?.releasePointerCapture(event.pointerId);
      } catch {
        // The pointer may already have been released.
      }
    }
  };

  const zoomBy = useCallback(
    (factor: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const current = useEditorStore.getState().viewport;
      const zoom = clamp(current.zoom * factor, 0.1, 4);
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      setViewport({
        zoom,
        x: cx - (cx - current.x) * (zoom / current.zoom),
        y: cy - (cy - current.y) * (zoom / current.zoom),
      });
    },
    [setViewport]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const state = useEditorStore.getState();
      const current = state.viewport;
      const rect = container.getBoundingClientRect();

      if (event.ctrlKey || event.metaKey) {
        const zoom = clamp(current.zoom * Math.exp(-event.deltaY * 0.002), 0.1, 4);
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        state.setViewport({
          zoom,
          x: px - (px - current.x) * (zoom / current.zoom),
          y: py - (py - current.y) * (zoom / current.zoom),
        });
      } else {
        state.setViewport({
          ...current,
          x: current.x - event.deltaX,
          y: current.y - event.deltaY,
        });
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  const duplicateSelected = useCallback(() => {
    const state = useEditorStore.getState();
    const selected = state.selectedIds
      .map((id) => state.elements[id])
      .filter((element): element is BoardElement => Boolean(element));
    if (!selected.length) return;

    const orders = Object.values(state.elements).map((element) => element.order);
    let order = orderAtEnd(orders);
    const copies = selected.map((element) => {
      order = orderBetween(order, null);
      return {
        ...element,
        id: newId(),
        x: element.x + 24,
        y: element.y + 24,
        order,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as BoardElement;
    });
    addElements(copies);
  }, [addElements]);

  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeElements(useEditorStore.getState().selectedIds);
        return;
      }
      if (event.key === "Escape") {
        setEditingId(null);
        clearSelection();
        setTool("select");
        return;
      }
      if (event.code === "Space") {
        spaceRef.current = true;
        event.preventDefault();
        return;
      }
      if (mod) return;

      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        onRequestImage();
        return;
      }

      const nextTool = SHORTCUT_TOOLS[event.key.toLowerCase()];
      if (nextTool) {
        event.preventDefault();
        setTool(nextTool);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") spaceRef.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    clearSelection,
    duplicateSelected,
    onRequestImage,
    redo,
    removeElements,
    setTool,
    undo,
  ]);

  const cursor =
    tool === "hand" || spaceRef.current
      ? dragRef.current
        ? "grabbing"
        : "grab"
      : tool === "select"
        ? editingId
          ? "text"
          : "default"
        : tool === "eraser"
          ? "cell"
          : "crosshair";

  const arrowElements = sortedElements.filter(
    (element) => element.type === "arrow"
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-muted/30"
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        const files = Array.from(event.dataTransfer.files).filter((file) =>
          file.type.startsWith("image/")
        );
        if (files.length) onDropFiles(files);
      }}
    >
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        style={{ cursor }}
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <pattern
            id="board-dots"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.1" fill="#cbd5e1" />
          </pattern>
          <pattern
            id="board-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          </pattern>
          {arrowElements.map((element) => (
            <marker
              key={element.id}
              id={`arrowhead-${element.id}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                fill={element.style.stroke}
              />
            </marker>
          ))}
        </defs>

        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
          <rect
            x={0}
            y={0}
            width={page.width}
            height={page.height}
            fill={page.background.color}
            stroke="#cbd5e1"
            strokeWidth={1 / viewport.zoom}
            style={{ filter: "drop-shadow(0 8px 24px rgba(15, 23, 42, 0.08))" }}
          />
          {page.background.type !== "solid" ? (
            <rect
              x={0}
              y={0}
              width={page.width}
              height={page.height}
              fill={
                page.background.type === "grid"
                  ? "url(#board-grid)"
                  : "url(#board-dots)"
              }
              pointerEvents="none"
            />
          ) : null}

          {sortedElements.map((element) => (
            <CanvasElement
              key={element.id}
              element={element}
              asset={
                element.type === "image"
                  ? imagesById.get(element.imageId)
                  : undefined
              }
              isSelected={selectedIds.includes(element.id)}
              onPointerDown={handleElementPointerDown}
              onDoubleClick={(target) => {
                if (target.type === "text") {
                  pushHistory();
                  setEditingId(target.id);
                }
              }}
              onContextMenu={(event, target) => {
                event.preventDefault();
                select([target.id]);
              }}
            />
          ))}

          {selectedElements.length === 1 ? (
            <SelectionOutline
              element={selectedElements[0]}
              zoom={viewport.zoom}
              onResizeStart={handleResizeStart}
            />
          ) : null}

          {selectedElements.length > 1
            ? selectedElements.map((element) => {
                const bounds = elementBounds(element);
                return (
                  <rect
                    key={`selection-${element.id}`}
                    x={bounds.x}
                    y={bounds.y}
                    width={bounds.w}
                    height={bounds.h}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={1 / viewport.zoom}
                    pointerEvents="none"
                  />
                );
              })
            : null}

          {marquee ? (
            <rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.w}
              height={marquee.h}
              fill="rgba(37, 99, 235, 0.08)"
              stroke="#2563eb"
              strokeWidth={1 / viewport.zoom}
              strokeDasharray={`${4 / viewport.zoom} ${3 / viewport.zoom}`}
              pointerEvents="none"
            />
          ) : null}
        </g>
      </svg>

      {editingElement ? (
        <textarea
          autoFocus
          value={editingElement.text}
          onChange={(event) => {
            const value = event.target.value;
            const lines = value.split("\n");
            const width = Math.max(
              120,
              Math.max(...lines.map((line) => line.length)) *
                editingElement.style.fontSize *
                0.58
            );
            updateElement(editingElement.id, {
              text: value,
              w: width,
              h: Math.max(
                editingElement.style.fontSize * 1.4,
                lines.length * editingElement.style.fontSize * 1.25
              ),
            });
          }}
          onBlur={() => setEditingId(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setEditingId(null);
            }
          }}
          className="absolute resize-none rounded-sm border-2 border-primary/60 bg-white/80 p-0 text-slate-900 shadow-sm outline-none"
          style={{
            left: viewport.x + editingElement.x * viewport.zoom,
            top: viewport.y + editingElement.y * viewport.zoom,
            width: Math.max(120, editingElement.w * viewport.zoom),
            minHeight: Math.max(32, editingElement.h * viewport.zoom),
            fontSize: editingElement.style.fontSize * viewport.zoom,
            lineHeight: 1.25,
            fontFamily: editingElement.style.fontFamily,
            color: editingElement.style.stroke,
          }}
        />
      ) : null}

      {dragOver ? (
        <div className="pointer-events-none absolute inset-4 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 text-sm font-medium text-primary">
          Drop images to add them to this page
        </div>
      ) : null}

      <div className="absolute bottom-4 right-4 flex items-center gap-0.5 rounded-lg border border-border bg-background/95 p-1 shadow-sm backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => zoomBy(1 / 1.2)}
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => zoomBy(1.2)}
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={fitToPage}
          aria-label="Fit page"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SelectionOutline({
  element,
  zoom,
  onResizeStart,
}: {
  element: BoardElement;
  zoom: number;
  onResizeStart: (
    event: ReactPointerEvent,
    element: BoardElement,
    handle: Handle
  ) => void;
}) {
  const bounds = elementBounds(element);
  const size = 9 / zoom;
  const handles: { key: Handle; x: number; y: number }[] = [
    { key: "nw", x: bounds.x, y: bounds.y },
    { key: "ne", x: bounds.x + bounds.w, y: bounds.y },
    { key: "sw", x: bounds.x, y: bounds.y + bounds.h },
    { key: "se", x: bounds.x + bounds.w, y: bounds.y + bounds.h },
  ];

  const canResize = !["line", "arrow", "freehand"].includes(element.type);

  return (
    <g>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.w}
        height={bounds.h}
        fill="none"
        stroke="#2563eb"
        strokeWidth={1.5 / zoom}
        strokeDasharray={`${6 / zoom} ${4 / zoom}`}
        pointerEvents="none"
      />
      {canResize
        ? handles.map((handle) => (
            <rect
              key={handle.key}
              x={handle.x - size / 2}
              y={handle.y - size / 2}
              width={size}
              height={size}
              rx={2 / zoom}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth={1.5 / zoom}
              style={{ cursor: `${handle.key}-resize` }}
              onPointerDown={(event) =>
                onResizeStart(event, element, handle.key)
              }
            />
          ))
        : null}
    </g>
  );
}
