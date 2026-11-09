# Fireboard

A multi-page drawing and diagramming app built with React, Vite, Tailwind and
Firebase. Every account owns its own drawings; each drawing has pages, each page
has dgmjs shapes, and images are compressed and stored inside Firestore — no
Cloud Storage bucket is required.

## Features

- Google sign-in with a private per-account workspace
- Any number of drawings, each with any number of pages
- Pages: add, rename, duplicate, delete and drag-to-reorder
- Infinite canvas powered by [dgmjs](https://dgmjs.dev):
  rectangle, ellipse, line, connector, text, image, freehand, highlighter,
  frame, groups and smart-shape support
- Floating navigator (pages + layers) and inspector (basic + expert)
- Properties for position, size, rotation, opacity, fill, stroke, dashes,
  roughness, corners, typography, alignment and arrowheads
- Autosave with visible save status and retry
- Image uploads from the toolbar, drag-and-drop or clipboard paste
  - client-side downscale + WebP conversion
  - progressive compression until the image fits in a Firestore document
  - SHA-256 de-duplication inside a drawing
  - stored as data URLs in Firestore, never in Cloud Storage
- Export the page or selection as PNG, JPEG, WebP or SVG
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
  name, order, width, height, background, thumbnailUrl, elementCount,
  schemaVersion, pageScale, pageOrigin, timestamps

drawings/{drawingId}/pages/{pageId}/elements/{shapeId}
  index, shape (dgmjs shape JSON, image data stripped),
  imageIds (shape id -> image asset id), timestamps, createdBy

drawings/{drawingId}/images/{imageId}
  url (base64 WebP), thumbUrl (base64 WebP), width, height,
  bytes, contentType, sha256, refCount
```

Each element document contains one top-level dgmjs shape, including any nested
children and connector references. Ordering is stored as an integer `index`, so
a page is rebuilt by sorting shape documents and loading them as one dgmjs page.

Images are compressed to fit under the Firestore 1 MiB document limit. The
largest encoded image is capped at ~700 KB of base64 text, with a much smaller
thumbnail used for page previews. Shape documents store only an `imageId`
reference, and the image data is re-attached when the page loads.

Pages created before the dgmjs migration (`schemaVersion: 1`) are converted on
first open: rectangles, ellipses, lines, arrows, text, freehand strokes and
images are mapped to their dgmjs equivalents in place.

## Licensing

The editor uses [`@dgmjs/core`](https://www.npmjs.com/package/@dgmjs/core),
which is distributed under **GPLv3**. If you distribute this application, you
must comply with GPLv3 or obtain a commercial license from the dgmjs author.
The `@dgmjs/react` wrapper uses a separate DGM license. See
[the dgmjs license page](https://dgmjs.dev/overview/license/) for details.
This project is distributed under GPLv3; see [LICENSE](LICENSE).

## Scripts

```bash
npm run dev       # start Vite
npm run build     # type-check + production build
npm run preview   # preview the build
npm run lint
```
