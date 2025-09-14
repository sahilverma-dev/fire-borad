import type { ElementStyle, ElementType, Point } from "@/types/models";

export const defaultStyle: ElementStyle = {
  stroke: "#0f172a",
  fill: "transparent",
  strokeWidth: 2,
  dash: "solid",
  radius: 8,
  fontSize: 22,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  textAlign: "left",
};

export const palette = [
  "#0f172a",
  "#2563eb",
  "#0891b2",
  "#16a34a",
  "#ca8a04",
  "#dc2626",
  "#db2777",
  "#7c3aed",
  "#64748b",
  "#ffffff",
];

export function styleForType(type: ElementType): ElementStyle {
  switch (type) {
    case "rect":
      return { ...defaultStyle, fill: "transparent", radius: 10 };
    case "ellipse":
      return { ...defaultStyle, fill: "transparent" };
    case "line":
    case "arrow":
      return { ...defaultStyle, fill: "none" };
    case "text":
      return { ...defaultStyle, stroke: "#0f172a", fill: "none", fontSize: 24 };
    case "freehand":
      return { ...defaultStyle, fill: "none", strokeWidth: 3 };
    default:
      return defaultStyle;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalizeRect(start: Point, end: Point) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  };
}

export function boundsOfPoints(points: Point[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
