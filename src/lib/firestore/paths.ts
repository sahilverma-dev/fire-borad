import { collection, doc } from "firebase/firestore";

import { db } from "@/firebase/config";
import { createConverter } from "@/lib/firestore/converters";
import type { Drawing, ImageAsset, Page } from "@/types/models";

export const drawingConverter = createConverter<Drawing>();
export const pageConverter = createConverter<Page>();
export const imageConverter = createConverter<ImageAsset>();

export const usersCol = () => collection(db, "users");

export const drawingsRawCol = () => collection(db, "drawings");
export const drawingsCol = () => drawingsRawCol().withConverter(drawingConverter);
export const drawingDoc = (drawingId: string) => doc(db, "drawings", drawingId);
export const drawingTypedDoc = (drawingId: string) =>
  drawingDoc(drawingId).withConverter(drawingConverter);

export const pagesRawCol = (drawingId: string) =>
  collection(db, "drawings", drawingId, "pages");
export const pagesCol = (drawingId: string) =>
  pagesRawCol(drawingId).withConverter(pageConverter);
export const pageDoc = (drawingId: string, pageId: string) =>
  doc(db, "drawings", drawingId, "pages", pageId);
export const pageTypedDoc = (drawingId: string, pageId: string) =>
  pageDoc(drawingId, pageId).withConverter(pageConverter);

export const elementsRawCol = (drawingId: string, pageId: string) =>
  collection(db, "drawings", drawingId, "pages", pageId, "elements");
export const elementDoc = (
  drawingId: string,
  pageId: string,
  elementId: string
) => doc(db, "drawings", drawingId, "pages", pageId, "elements", elementId);

export const imagesRawCol = (drawingId: string) =>
  collection(db, "drawings", drawingId, "images");
export const imagesCol = (drawingId: string) =>
  imagesRawCol(drawingId).withConverter(imageConverter);
export const imageDoc = (drawingId: string, imageId: string) =>
  doc(db, "drawings", drawingId, "images", imageId);
export const imageTypedDoc = (drawingId: string, imageId: string) =>
  imageDoc(drawingId, imageId).withConverter(imageConverter);
