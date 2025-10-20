# Fireboard

A multi-page drawing app built with React, Vite, Tailwind and Firebase. Every
account owns its own drawings; each drawing has pages, each page has elements,
and images are stored in Firebase Storage rather than inside Firestore.

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
  - 400px thumbnails
  - SHA-256 de-duplication inside a drawing
  - original kept in Storage for future export
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

Enable **Google** in Firebase Authentication, create a Firestore database and a
Storage bucket, then deploy the rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
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
  storagePath, largePath, thumbPath, url, thumbUrl, width, height,
  bytes, contentType, sha256, refCount
```

Storage layout:

```
users/{uid}/drawings/{drawingId}/images/{imageId}/original.*
users/{uid}/drawings/{drawingId}/images/{imageId}/large.webp
users/{uid}/drawings/{drawingId}/images/{imageId}/thumb.webp
users/{uid}/drawings/{drawingId}/thumbs/{pageId}.webp
```

Ordering uses fractional index strings, so reordering a page or moving an
element to the front is a single document write.

## Scripts

```bash
npm run dev       # start Vite
npm run build     # type-check + production build
npm run preview   # preview the build
npm run lint
```
