import type { BoardElement, Page } from "@/types/models";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function transform(element: BoardElement): string {
  if (!element.angle) return "";
  const cx = element.x + element.w / 2;
  const cy = element.y + element.h / 2;
  return ` transform="rotate(${element.angle} ${cx} ${cy})"`;
}

function common(element: BoardElement): string {
  return `opacity="${element.opacity}"${transform(element)}`;
}

function renderElement(element: BoardElement): string {
  const { style } = element;
  const dash =
    style.dash === "dashed"
      ? ' stroke-dasharray="12 8"'
      : style.dash === "dotted"
        ? ' stroke-dasharray="2 6"'
        : "";

  switch (element.type) {
    case "rect":
      return `<rect x="${element.x}" y="${element.y}" width="${element.w}" height="${element.h}" rx="${style.radius}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dash} ${common(element)} />`;
    case "ellipse":
      return `<ellipse cx="${element.x + element.w / 2}" cy="${element.y + element.h / 2}" rx="${Math.abs(element.w / 2)}" ry="${Math.abs(element.h / 2)}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dash} ${common(element)} />`;
    case "line":
    case "arrow": {
      const marker =
        element.type === "arrow"
          ? ' marker-end="url(#thumb-arrow)"'
          : "";
      return `<line x1="${element.x}" y1="${element.y}" x2="${element.x + element.w}" y2="${element.y + element.h}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dash}${marker} ${common(element)} />`;
    }
    case "text":
      return `<text x="${element.x}" y="${element.y + style.fontSize}" font-family="${escapeXml(style.fontFamily)}, sans-serif" font-size="${style.fontSize}" fill="${style.stroke}" ${common(element)}>${escapeXml(element.text)}</text>`;
    case "image":
      return `<rect x="${element.x}" y="${element.y}" width="${element.w}" height="${element.h}" rx="6" fill="#e5e7eb" stroke="#cbd5e1" ${common(element)} />`;
    case "freehand": {
      if (!element.points.length) return "";
      const [first, ...rest] = element.points;
      const path = [
        `M ${first.x} ${first.y}`,
        ...rest.map((point) => `L ${point.x} ${point.y}`),
      ].join(" ");
      return `<path d="${path}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${common(element)} />`;
    }
    default:
      return "";
  }
}

export function elementsToSvg(
  elements: BoardElement[],
  page: Pick<Page, "width" | "height" | "background">
): string {
  const sorted = [...elements].sort((a, b) =>
    a.order.localeCompare(b.order)
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}">
  <defs>
    <marker id="thumb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
    </marker>
  </defs>
  <rect width="${page.width}" height="${page.height}" fill="${page.background.color}" />
  ${sorted.map(renderElement).join("\n  ")}
</svg>`;
}

export async function svgToDataUrl(
  svg: string,
  width: number,
  height: number,
  maxWidth = 400,
  quality = 0.7
): Promise<string | null> {
  try {
    const scale = Math.min(1, maxWidth / Math.max(width, height));
    const image = new Image();
    image.decoding = "async";

    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not render thumbnail"));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const webp = canvas.toDataURL("image/webp", quality);
    if (webp.startsWith("data:image/webp")) return webp;
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return null;
  }
}
