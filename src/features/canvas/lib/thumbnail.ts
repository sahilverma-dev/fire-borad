import { Canvas, themeColors, type Editor, type Page } from "@dgmjs/core";

interface PageWithBackground extends Page {
  background?: {
    type?: "solid" | "grid" | "dots";
    color?: string;
  };
}

function drawBackground(
  context: CanvasRenderingContext2D,
  page: PageWithBackground,
  width: number,
  height: number,
  scale: number
) {
  const background = page.background;
  context.fillStyle = background?.color || "#ffffff";
  context.fillRect(0, 0, width * scale, height * scale);

  if (!background || background.type === "solid") return;

  const step = 24 * scale;
  context.save();
  context.strokeStyle = background.type === "dots" ? "#cbd5e1" : "#e2e8f0";
  context.fillStyle = context.strokeStyle;
  context.lineWidth = Math.max(1, scale);
  for (let x = step; x < width * scale; x += step) {
    for (let y = step; y < height * scale; y += step) {
      if (background.type === "dots") {
        context.beginPath();
        context.arc(x, y, Math.max(0.6, 1.1 * scale), 0, Math.PI * 2);
        context.fill();
      } else {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height * scale);
        context.stroke();
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width * scale, y);
        context.stroke();
      }
    }
  }
  context.restore();
}

/**
 * Renders a page-sized thumbnail for the page strip and dashboard covers.
 * The dgmjs page is temporarily re-laid out for the offscreen canvas and then
 * restored for the editor canvas.
 */
export function renderPageThumbnail(
  editor: Editor,
  dgmPage: Page,
  maxWidth = 400,
  quality = 0.7
): string | null {
  try {
    const page = dgmPage as PageWithBackground;
    const [width, height] = Array.isArray(page.size)
      ? page.size
      : [page.width, page.height];
    const safeWidth = Math.max(1, width || 1);
    const safeHeight = Math.max(1, height || 1);
    const scale = Math.max(
      0.02,
      Math.min(1, maxWidth / Math.max(safeWidth, safeHeight))
    );

    const canvasElement = document.createElement("canvas");
    canvasElement.width = Math.max(1, Math.round(safeWidth * scale));
    canvasElement.height = Math.max(1, Math.round(safeHeight * scale));

    const context = canvasElement.getContext("2d");
    if (!context) return null;

    drawBackground(context, page, safeWidth, safeHeight, scale);

    const canvas = new Canvas(canvasElement, scale);
    canvas.origin = [0, 0];
    canvas.ratio = scale;
    canvas.scale = 1;
    canvas.colorVariables = themeColors.light;

    page.update(canvas);
    page.draw(canvas, false);
    page.update(editor.canvas);

    const webp = canvasElement.toDataURL("image/webp", quality);
    if (webp.startsWith("data:image/webp")) return webp;
    return canvasElement.toDataURL("image/png");
  } catch {
    return null;
  }
}
