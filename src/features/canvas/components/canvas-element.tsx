import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useState } from "react";

import type { BoardElement, ImageAsset } from "@/types/models";

interface CanvasElementProps {
  element: BoardElement;
  asset?: ImageAsset;
  isSelected: boolean;
  onPointerDown: (event: ReactPointerEvent, element: BoardElement) => void;
  onDoubleClick: (element: BoardElement) => void;
  onContextMenu: (event: ReactMouseEvent, element: BoardElement) => void;
}

function rotation(element: BoardElement): string | undefined {
  if (!element.angle) return undefined;
  const cx = element.x + element.w / 2;
  const cy = element.y + element.h / 2;
  return `rotate(${element.angle} ${cx} ${cy})`;
}

export function CanvasElement({
  element,
  asset,
  isSelected,
  onPointerDown,
  onDoubleClick,
  onContextMenu,
}: CanvasElementProps) {
  const { style } = element;
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = asset?.url;

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const dashArray =
    style.dash === "dashed" ? "12 8" : style.dash === "dotted" ? "2 6" : undefined;

  const shared = {
    opacity: element.opacity,
    transform: rotation(element),
    onPointerDown: (event: ReactPointerEvent) =>
      onPointerDown(event, element),
    onDoubleClick: () => onDoubleClick(element),
    onContextMenu: (event: ReactMouseEvent) =>
      onContextMenu(event, element),
    style: {
      cursor:
        element.locked ? "not-allowed" : isSelected ? "move" : "pointer",
    },
  };

  switch (element.type) {
    case "rect":
      return (
        <rect
          {...shared}
          x={element.x}
          y={element.y}
          width={Math.max(1, element.w)}
          height={Math.max(1, element.h)}
          rx={style.radius}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          strokeDasharray={dashArray}
        />
      );
    case "ellipse":
      return (
        <ellipse
          {...shared}
          cx={element.x + element.w / 2}
          cy={element.y + element.h / 2}
          rx={Math.max(1, Math.abs(element.w / 2))}
          ry={Math.max(1, Math.abs(element.h / 2))}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          strokeDasharray={dashArray}
        />
      );
    case "line":
    case "arrow":
      return (
        <line
          {...shared}
          x1={element.x}
          y1={element.y}
          x2={element.x + element.w}
          y2={element.y + element.h}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          markerEnd={
            element.type === "arrow" ? `url(#arrowhead-${element.id})` : undefined
          }
        />
      );
    case "text": {
      const lines = element.text.split("\n");
      return (
        <text
          {...shared}
          x={element.x}
          y={element.y + style.fontSize}
          fill={style.stroke}
          fontSize={style.fontSize}
          fontFamily={style.fontFamily}
          style={{ ...shared.style, whiteSpace: "pre", userSelect: "none" }}
        >
          {lines.map((line, index) => (
            <tspan
              key={index}
              x={element.x}
              dy={index === 0 ? 0 : style.fontSize * 1.25}
            >
              {line || " "}
            </tspan>
          ))}
        </text>
      );
    }
    case "image":
      return asset && !imageFailed ? (
        <image
          {...shared}
          href={asset.url}
          x={element.x}
          y={element.y}
          width={Math.max(1, element.w)}
          height={Math.max(1, element.h)}
          preserveAspectRatio="none"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <g {...shared}>
          <rect
            x={element.x}
            y={element.y}
            width={Math.max(1, element.w)}
            height={Math.max(1, element.h)}
            rx={8}
            fill="hsl(var(--muted))"
            stroke="hsl(var(--border))"
          />
          <text
            x={element.x + element.w / 2}
            y={element.y + element.h / 2}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize={14}
          >
            Image loading…
          </text>
        </g>
      );
    case "freehand": {
      if (element.points.length < 2) return null;
      const [first, ...rest] = element.points;
      const path = `M ${first.x} ${first.y} ${rest
        .map((point) => `L ${point.x} ${point.y}`)
        .join(" ")}`;
      return (
        <path
          {...shared}
          d={path}
          fill="none"
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    default:
      return null;
  }
}
