const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_DATA_URL_CHARS = 700_000;
const THUMB_MAX_DIMENSION = 400;

const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export interface ProcessedImage {
  /** Base64 WebP data URL stored in Firestore (never Cloud Storage). */
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  bytes: number;
  contentType: string;
  sha256: string;
}

export class ImageProcessingError extends Error {}

/**
 * Progressively downscales/compresses until the encoded image fits comfortably
 * inside a Firestore document (1 MiB limit).
 */
const CANDIDATES: { dimension: number; quality: number }[] = [
  { dimension: 2048, quality: 0.82 },
  { dimension: 1800, quality: 0.76 },
  { dimension: 1600, quality: 0.72 },
  { dimension: 1400, quality: 0.68 },
  { dimension: 1200, quality: 0.62 },
  { dimension: 1024, quality: 0.58 },
  { dimension: 900, quality: 0.52 },
  { dimension: 768, quality: 0.46 },
  { dimension: 640, quality: 0.4 },
];

function drawToCanvas(
  source: ImageBitmap,
  maxDimension: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const scale = Math.min(
    1,
    maxDimension / Math.max(source.width, source.height)
  );
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageProcessingError("Canvas is not available");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);

  return { canvas, width, height };
}

function encode(canvas: HTMLCanvasElement, quality: number): string {
  const webp = canvas.toDataURL("image/webp", quality);
  // Older Safari silently falls back to PNG, which is far too large.
  if (webp.startsWith("data:image/webp")) return webp;
  return canvas.toDataURL("image/jpeg", quality);
}

function bytesFromDataUrl(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.round((base64.length * 3) / 4);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new ImageProcessingError(
      "Unsupported file. Use PNG, JPEG, WebP or GIF."
    );
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new ImageProcessingError("Image is larger than 15 MB.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    let url = "";
    let width = bitmap.width;
    let height = bitmap.height;

    for (const candidate of CANDIDATES) {
      const drawn = drawToCanvas(bitmap, candidate.dimension);
      const encoded = encode(drawn.canvas, candidate.quality);
      if (encoded.length <= MAX_IMAGE_DATA_URL_CHARS) {
        url = encoded;
        width = drawn.width;
        height = drawn.height;
        break;
      }
    }

    if (!url) {
      throw new ImageProcessingError(
        "This image is too detailed to store. Try a smaller or simpler image."
      );
    }

    const thumb = drawToCanvas(bitmap, THUMB_MAX_DIMENSION);
    const thumbUrl = encode(thumb.canvas, 0.72);

    return {
      url,
      thumbUrl,
      width,
      height,
      bytes: bytesFromDataUrl(url),
      contentType: url.slice(5, url.indexOf(";")),
      sha256: await sha256(url),
    };
  } finally {
    bitmap.close();
  }
}

export function imageFileFromClipboard(
  event: ClipboardEvent
): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;
  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}
