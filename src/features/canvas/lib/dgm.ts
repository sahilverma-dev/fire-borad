import {
  Ellipse,
  FillStyle,
  HorzAlign,
  Image as DGMImage,
  LineEndType,
  Rectangle,
  Sizable,
  Text as DGMText,
  VertAlign,
  type Editor,
  type Page as DgmPage,
  type Shape,
} from "@dgmjs/core";

import type {
  BoardElement,
  ImageAsset,
  Page,
  ShapeRecord,
} from "@/types/models";

export const DGM_SCHEMA_VERSION = 2;

export interface ShapeSnapshotEntry {
  index: number;
  json: string;
  imageIds: string;
}

export type ShapeSnapshot = Record<string, ShapeSnapshotEntry>;

export interface LoadedPageState {
  snapshot: ShapeSnapshot;
  imageUsage: Map<string, number>;
}

export function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const walk = (input: unknown): unknown => {
    if (input === null || typeof input !== "object") return input;
    if (seen.has(input)) return null;
    seen.add(input);
    if (Array.isArray(input)) return input.map(walk);
    const record = input as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      output[key] = walk(record[key]);
    }
    return output;
  };

  return JSON.stringify(walk(value));
}

function collectShapeImages(
  runtime: Shape,
  json: Record<string, unknown>,
  imageIds: Record<string, string>,
  resolveImageId?: (dataUrl: string) => string | undefined
) {
  if (runtime.type === "Image") {
    let imageId = (runtime as DGMImage & { __imageId?: string }).__imageId;
    if (!imageId && typeof json.imageData === "string" && resolveImageId) {
      imageId = resolveImageId(json.imageData);
    }
    if (imageId) {
      imageIds[runtime.id] = imageId;
      json.imageData = "";
    }
  }

  const children = (runtime.children ?? []) as Shape[];
  const jsonChildren = Array.isArray(json.children)
    ? (json.children as Record<string, unknown>[])
    : [];
  children.forEach((child, index) => {
    const node = jsonChildren[index];
    if (node) collectShapeImages(child, node, imageIds, resolveImageId);
  });
}

function dashToPattern(dash: BoardElement["style"]["dash"]): number[] {
  if (dash === "dashed") return [10, 6];
  if (dash === "dotted") return [2, 5];
  return [];
}

function normalizeFontFamily(value: string | undefined): string {
  if (!value) return "Inter";
  const lower = value.toLowerCase();
  if (lower.includes("gloria")) return "Gloria Hallelujah";
  if (lower.includes("mono")) return "IBM Plex Mono";
  if (lower.includes("serif")) return "Source Serif Pro";
  if (lower.includes("inter")) return "Inter";
  return "Inter";
}

function applyLegacyStyle(shape: Shape, element: BoardElement) {
  const { style } = element;
  shape.id = element.id;
  shape.rotate = element.angle ?? 0;
  shape.opacity = element.opacity ?? 1;
  shape.strokeColor = style.stroke || "$foreground";
  shape.strokeWidth = style.strokeWidth ?? 1;
  shape.strokePattern = dashToPattern(style.dash);

  const hasFill = style.fill && style.fill !== "none" && style.fill !== "transparent";
  shape.fillColor = hasFill ? style.fill : "$background";
  shape.fillStyle = hasFill ? FillStyle.SOLID : FillStyle.NONE;

  if (style.fontSize) shape.fontSize = style.fontSize;
  shape.fontFamily = normalizeFontFamily(style.fontFamily);
  shape.fontColor = style.stroke || "$foreground";
}

function legacyText(editor: Editor, element: BoardElement): DGMText {
  const text = editor.factory.createText(
    [
      [element.x, element.y],
      [element.x + element.w, element.y + element.h],
    ],
    (element as Extract<BoardElement, { type: "text" }>).text ?? ""
  );
  text.constraints = [];
  text.width = Math.max(element.w, 1);
  text.height = Math.max(element.h, 1);
  text.horzAlign =
    element.style.textAlign === "center"
      ? HorzAlign.CENTER
      : element.style.textAlign === "right"
        ? HorzAlign.RIGHT
        : HorzAlign.LEFT;
  text.vertAlign = VertAlign.TOP;
  return text;
}

/**
 * Converts one legacy BoardElement into a dgmjs shape. The legacy document id
 * is reused as the shape id so the first autosave overwrites the same doc.
 */
export function convertLegacyElement(
  editor: Editor,
  record: ShapeRecord
): Shape {
  const element = {
    ...(record.legacyData as unknown as BoardElement),
    id: record.id,
  } as BoardElement;

  let shape: Shape;

  switch (element.type) {
    case "ellipse": {
      shape = editor.factory.createEllipse([
        [element.x, element.y],
        [element.x + element.w, element.y + element.h],
      ]);
      break;
    }
    case "line":
    case "arrow": {
      const line = editor.factory.createLine([
        [element.x, element.y],
        [element.x + element.w, element.y + element.h],
      ]);
      line.fillStyle = FillStyle.NONE;
      if (element.type === "arrow") {
        line.headEndType = LineEndType.ARROW;
      }
      shape = line;
      break;
    }
    case "text": {
      shape = legacyText(editor, element);
      break;
    }
    case "image": {
      const image = new DGMImage();
      image.id = element.id;
      image.left = element.x;
      image.top = element.y;
      image.width = Math.max(element.w, 1);
      image.height = Math.max(element.h, 1);
      image.imageWidth = Math.max(
        (element as Extract<BoardElement, { type: "image" }>).naturalWidth ?? 1,
        1
      );
      image.imageHeight = Math.max(
        (element as Extract<BoardElement, { type: "image" }>).naturalHeight ?? 1,
        1
      );
      image.imageData = "";
      image.sizable = Sizable.RATIO;
      image.textEditable = false;
      shape = image;
      break;
    }
    case "freehand": {
      const points = (element as Extract<BoardElement, { type: "freehand" }>)
        .points;
      const path = points.length
        ? points.map((point) => [point.x, point.y])
        : [
            [element.x, element.y],
            [element.x + 1, element.y + 1],
          ];
      const freehand = editor.factory.createFreehand(path);
      freehand.fillStyle = FillStyle.NONE;
      freehand.strokeWidth = element.style.strokeWidth ?? 2;
      shape = freehand;
      break;
    }
    case "rect":
    default: {
      const rectangle = editor.factory.createRectangle([
        [element.x, element.y],
        [element.x + element.w, element.y + element.h],
      ]);
      const radius = Math.max(0, element.style.radius ?? 0);
      rectangle.corners = [radius, radius, radius, radius];
      shape = rectangle;
      break;
    }
  }

  applyLegacyStyle(shape, element);
  return shape;
}

function legacyImageId(record: ShapeRecord): string | null {
  const element = record.legacyData as unknown as BoardElement | undefined;
  if (element?.type === "image") return element.imageId;
  return null;
}

export function setPageChrome(editor: Editor, page: Page) {
  const current = editor.getCurrentPage();
  if (!current) return;
  current.name = page.name;
  current.size = [page.width, page.height];
  editor.options.canvasColor = page.background.color || "#ffffff";
  editor.setShowGrid(page.background.type !== "solid");
  editor.repaint();
}

export function applyPageViewport(editor: Editor, page: Page) {
  if (
    typeof page.pageScale === "number" &&
    Array.isArray(page.pageOrigin) &&
    page.pageOrigin.length === 2
  ) {
    editor.setScale(page.pageScale);
    editor.setOrigin(page.pageOrigin[0], page.pageOrigin[1]);
  } else {
    editor.fitToScreen(1, 1);
  }
}

export function hydrateImages(
  page: DgmPage,
  imageIdsByShapeId: Map<string, string>,
  assets: Map<string, ImageAsset>
) {
  page.traverse((obj) => {
    if (obj.type !== "Image") return;
    const shape = obj as DGMImage & { __imageId?: string };
    const imageId = imageIdsByShapeId.get(shape.id);
    if (!imageId) return;
    shape.__imageId = imageId;
    const asset = assets.get(imageId);
    if (asset) {
      shape.imageData = asset.url;
      shape.imageWidth = asset.width;
      shape.imageHeight = asset.height;
    }
  });
}

export function countImageUsage(page: DgmPage): Map<string, number> {
  const usage = new Map<string, number>();
  page.traverse((obj) => {
    if (obj.type !== "Image") return;
    const imageId = (obj as DGMImage & { __imageId?: string }).__imageId;
    if (!imageId) return;
    usage.set(imageId, (usage.get(imageId) ?? 0) + 1);
  });
  return usage;
}

export function serializeShapeTree(
  shape: Shape,
  resolveImageId?: (dataUrl: string) => string | undefined
): {
  shape: Record<string, unknown>;
  imageIds: Record<string, string>;
} {
  const imageIds: Record<string, string> = {};
  const json = shape.toJSON(true) as Record<string, unknown>;
  collectShapeImages(shape, json, imageIds, resolveImageId);
  return { shape: json, imageIds };
}

/**
 * Loads one Firestore page into the editor. New shape docs are loaded as JSON;
 * legacy element docs are converted with the editor factory.
 */
export function loadPageIntoEditor(options: {
  editor: Editor;
  page: Page;
  records: ShapeRecord[];
  images: Map<string, ImageAsset>;
}): LoadedPageState {
  const { editor, page, records, images } = options;

  const shapeJsons: Record<string, unknown>[] = [];
  const snapshot: ShapeSnapshot = {};
  const imageIdsByShapeId = new Map<string, string>();
  const imageUsage = new Map<string, number>();

  for (const record of records) {
    if (!record.legacy && record.shape) {
      shapeJsons.push({ ...record.shape, parent: page.id });
      snapshot[record.id] = {
        index: record.index ?? shapeJsons.length - 1,
        json: stableStringify(record.shape),
        imageIds: stableStringify(record.imageIds ?? {}),
      };
      for (const [shapeId, imageId] of Object.entries(record.imageIds ?? {})) {
        imageIdsByShapeId.set(shapeId, imageId);
        imageUsage.set(imageId, (imageUsage.get(imageId) ?? 0) + 1);
      }
      continue;
    }

    const shape = convertLegacyElement(editor, record);
    const json = shape.toJSON(true) as Record<string, unknown>;
    json.parent = page.id;
    shapeJsons.push(json);
    const imageId = legacyImageId(record);
    if (imageId) {
      imageIdsByShapeId.set(shape.id, imageId);
      imageUsage.set(imageId, (imageUsage.get(imageId) ?? 0) + 1);
    }
  }

  const docJson = {
    id: `doc-${page.id}`,
    type: "Doc",
    version: 1,
    children: [
      {
        id: page.id,
        type: "Page",
        name: page.name,
        size: [page.width, page.height],
        children: shapeJsons,
      },
    ],
  };

  editor.loadFromJSON(docJson);

  const current = editor.getCurrentPage();
  if (current) {
    hydrateImages(current, imageIdsByShapeId, images);
    setPageChrome(editor, page);
    applyPageViewport(editor, page);
    editor.repaint();
  }

  return { snapshot, imageUsage };
}

export function pageShapes(page: DgmPage): Shape[] {
  return page.children.filter((child): child is Shape =>
    Boolean((child as Shape).type && (child as Shape).toJSON)
  );
}

export function shapeLabel(shape: Shape): string {
  if (shape.name && shape.name.trim()) return shape.name;
  if (shape.type === "Text") {
    const text = (shape as DGMText).text as unknown;
    const plain = collectText(text);
    if (plain.trim()) return plain.trim().slice(0, 48);
  }
  return shape.type;
}

function collectText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as { text?: unknown; content?: unknown[] };
  const own = typeof record.text === "string" ? record.text : "";
  const children = Array.isArray(record.content)
    ? record.content.map(collectText).join(" ")
    : "";
  return `${own} ${children}`.trim();
}

export function isTextShape(shape: Shape): shape is DGMText {
  return shape.type === "Text";
}

export function isBoxShape(shape: Shape): shape is Rectangle | Ellipse | DGMText {
  return (
    shape.type === "Rectangle" ||
    shape.type === "Ellipse" ||
    shape.type === "Text"
  );
}
