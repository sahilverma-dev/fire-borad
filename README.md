# Fireboard

A multi-page drawing app built with React, Vite, Tailwind and Firebase. Every
account owns its own drawings; each drawing has pages, each page has elements,
and images are compressed and stored inside Firestore — no Cloud Storage bucket
is required.

## Features

- Google sign-in with a private per-account workspace
- Any number of drawings, each with any number of pages
- Pages: add, rename, duplicate, delete and drag-to-reorder
- SVG canvas: select, pan, zoom, rectangle, ellipse, line, arrow, text,
  freehand and eraser
- Properties panel for position, size, colors, dashes, opacity, rotation and
  layer order
- Autosave with visible save status and retry
- Image uploads from the toolbar, drag-and-drop or clipboard paste
  - client-side downscale + WebP conversion
  - progressive compression until the image fits in a Firestore document
  - 400px thumbnails
  - SHA-256 de-duplication inside a drawing
  - stored as data URLs in Firestore, never in Cloud Storage
- Soft-delete trash with restore and permanent delete
- Offline persistence through the Firestore local cache
- Dark / light / system themes

## Routes

| Path | Description |
| --- | --- |
| `/login` | Google sign-in |
| `/` | All drawings |
| `/d/:drawingId` | Resolves the last opened page |
| `/d/:drawingId/p/:pageId` | Canvas editor |
| `/trash` | Deleted drawings |
| `/settings` | Profile, appearance and sign out |

## Setup

```bash
npm install
cp .env.example .env
# fill in the VITE_* values from Firebase project settings
npm run dev
```

Enable **Google** in Firebase Authentication and create a Firestore database,
then deploy the rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Or run everything locally:

```bash
firebase emulators:start
# set VITE_USE_EMULATORS=true in .env
```

## Data model

```
users/{uid}

drawings/{drawingId}
  ownerId, memberIds, title, pageCount, elementCount, lastPageId,
  coverThumbUrl, isDeleted, deletedAt, timestamps

drawings/{drawingId}/pages/{pageId}
  name, order, width, height, background, thumbnailUrl, elementCount

drawings/{drawingId}/pages/{pageId}/elements/{elementId}
  type, order, x, y, w, h, angle, opacity, style, text/points/image

drawings/{drawingId}/images/{imageId}
  url (base64 WebP), thumbUrl (base64 WebP), width, height,
  bytes, contentType, sha256, refCount
```

Images are compressed to fit under the Firestore 1 MiB document limit. The
largest encoded image is capped at ~700 KB of base64 text, with a much smaller
thumbnail used for page previews.

Ordering uses fractional index strings, so reordering a page or moving an
element to the front is a single document write.

## Scripts

```bash
npm run dev       # start Vite
npm run build     # type-check + production build
npm run preview   # preview the build
npm run lint
```
