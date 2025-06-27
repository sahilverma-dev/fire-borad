const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
const LARGE_MAX_DIMENSION = 2048;
const THUMB_MAX_DIMENSION = 400;

const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export interface ProcessedImage {
  original: Blob;
  large: Blob;
  thumb: Blob;
  width: number;
  height: number;
  contentType: string;
  ext: string;
  sha256: string;
}

export class ImageProcessingError extends Error {}

function extensionFor(type: string): string {
  switch (type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new ImageProcessingError("Could not encode image"));
      },
      type,
      quality
    );
  });
}

async function encodeBest(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  const webp = await canvasToBlob(canvas, "image/webp", quality);
  if (webp.type === "image/webp") return webp;
  return canvasToBlob(canvas, "image/jpeg", quality);
}

async function sha256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
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
    const large = drawToCanvas(bitmap, LARGE_MAX_DIMENSION);
    const thumb = drawToCanvas(bitmap, THUMB_MAX_DIMENSION);

    const [largeBlob, thumbBlob] = await Promise.all([
      encodeBest(large.canvas, 0.82),
      encodeBest(thumb.canvas, 0.78),
    ]);

    return {
      original: file,
      large: largeBlob,
      thumb: thumbBlob,
      width: bitmap.width,
      height: bitmap.height,
      contentType: file.type,
      ext: extensionFor(file.type),
      sha256: await sha256(largeBlob),
    };
  } finally {
    bitmap.close();
  }
}

export async function fileFromClipboard(
  event: ClipboardEvent
): Promise<File | null> {
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
