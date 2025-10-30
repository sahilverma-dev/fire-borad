export type ElementType =
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "image"
  | "freehand";

export type Tool =
  | "select"
  | "hand"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "image"
  | "pen"
  | "eraser";

export interface Point {
  x: number;
  y: number;
}

export interface ElementStyle {
  stroke: string;
  fill: string;
  strokeWidth: number;
  dash: "solid" | "dashed" | "dotted";
  radius: number;
  fontSize: number;
  fontFamily: string;
  textAlign: "left" | "center" | "right";
}

export interface BaseElement {
  id: string;
  type: ElementType;
  order: string;
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  opacity: number;
  style: ElementStyle;
  locked?: boolean;
  hidden?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ShapeElement extends BaseElement {
  type: "rect" | "ellipse" | "line" | "arrow";
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
}

export interface ImageElement extends BaseElement {
  type: "image";
  imageId: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface FreehandElement extends BaseElement {
  type: "freehand";
  points: Point[];
}

export type BoardElement =
  | ShapeElement
  | TextElement
  | ImageElement
  | FreehandElement;

export interface PageBackground {
  type: "grid" | "dots" | "solid";
  color: string;
}

export interface Drawing {
  id: string;
  ownerId: string;
  memberIds: string[];
  title: string;
  description: string | null;
  coverThumbUrl: string | null;
  pageCount: number;
  elementCount: number;
  lastPageId: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Page {
  id: string;
  drawingId: string;
  name: string;
  order: string;
  width: number;
  height: number;
  background: PageBackground;
  thumbnailUrl: string | null;
  elementCount: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ImageAsset {
  id: string;
  drawingId: string;
  /** Base64 WebP data URL — Firestore only, no Cloud Storage. */
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  bytes: number;
  contentType: string;
  sha256: string;
  refCount: number;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
