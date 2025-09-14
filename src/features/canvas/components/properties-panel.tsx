import {
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { newId } from "@/lib/id";
import { orderAtEnd, orderBetween } from "@/lib/firestore/fractional";
import { cn } from "@/lib/utils";
import type { BoardElement, ElementStyle } from "@/types/models";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span className="w-16 shrink-0">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <Input
      type="number"
      value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
      step={step}
      min={min}
      max={max}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (!Number.isNaN(next)) onChange(next);
      }}
      className="h-8 w-24 text-right text-xs"
    />
  );
}

function ColorRow({
  label,
  value,
  onChange,
  onClear,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}) {
  const safeValue = value === "transparent" || value === "none" ? "#ffffff" : value;
  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={safeValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-9 cursor-pointer rounded border border-input bg-background p-0.5"
          aria-label={label}
        />
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded border border-input px-1.5 py-1 text-[10px] text-muted-foreground hover:bg-accent"
          >
            none
          </button>
        ) : null}
      </div>
    </Field>
  );
}

export function PropertiesPanel() {
  const elements = useEditorStore((state) => state.elements);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const updateElement = useEditorStore((state) => state.updateElement);
  const removeElements = useEditorStore((state) => state.removeElements);
  const addElements = useEditorStore((state) => state.addElements);

  const selected = selectedIds
    .map((id) => elements[id])
    .filter((element): element is BoardElement => Boolean(element));

  const duplicateSelected = () => {
    if (!selected.length) return;
    const orders = Object.values(elements).map((element) => element.order);
    let order = orderAtEnd(orders);
    addElements(
      selected.map((element) => {
        order = orderBetween(order, null);
        return {
          ...element,
          id: newId(),
          x: element.x + 24,
          y: element.y + 24,
          order,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as BoardElement;
      })
    );
  };

  if (!selected.length) {
    return (
      <aside className="hidden w-72 shrink-0 flex-col border-l border-border bg-background p-5 lg:flex">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          Properties
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Select an element to edit its size, colors and position. Use the
          toolbar on the left to draw.
        </p>
        <Separator className="my-4" />
        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Tips</p>
          <p>⌘ / Ctrl + scroll to zoom.</p>
          <p>Space + drag to pan, or pick the hand tool.</p>
          <p>Double-click text to edit it.</p>
          <p>Drag images straight onto the canvas.</p>
        </div>
      </aside>
    );
  }

  if (selected.length > 1) {
    return (
      <aside className="absolute inset-x-2 bottom-24 z-20 max-h-[40vh] overflow-y-auto rounded-xl border bg-background/95 p-4 shadow-xl backdrop-blur lg:static lg:inset-auto lg:z-auto lg:max-h-none lg:w-72 lg:rounded-none lg:border-0 lg:border-l lg:bg-background lg:shadow-none">
        <p className="text-sm font-medium">{selected.length} elements selected</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Move them together or delete the selection.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={duplicateSelected}>
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-destructive hover:text-destructive"
            onClick={() => removeElements(selectedIds)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </aside>
    );
  }

  const element = selected[0];
  const update = (patch: Partial<BoardElement>) =>
    updateElement(element.id, patch);
  const updateStyle = (patch: Partial<ElementStyle>) =>
    updateElement(element.id, { style: { ...element.style, ...patch } });

  const allOrders = Object.values(elements).map((item) => item.order);
  const minOrder = [...allOrders].sort()[0] ?? null;
  const supportsFill = ["rect", "ellipse"].includes(element.type);
  const supportsRadius = element.type === "rect";

  return (
    <aside className="absolute inset-x-2 bottom-24 z-20 max-h-[45vh] overflow-y-auto rounded-xl border bg-background/95 p-4 shadow-xl backdrop-blur lg:static lg:inset-auto lg:z-auto lg:max-h-none lg:w-72 lg:rounded-none lg:border-0 lg:border-l lg:bg-background lg:shadow-none lg:backdrop-blur-none">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium capitalize">{element.type}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          selected
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        <Field label="X">
          <NumberInput value={element.x} onChange={(x) => update({ x })} />
        </Field>
        <Field label="Y">
          <NumberInput value={element.y} onChange={(y) => update({ y })} />
        </Field>
        <Field label="Width">
          <NumberInput
            value={element.w}
            min={1}
            onChange={(w) => update({ w: Math.max(1, w) })}
          />
        </Field>
        <Field label="Height">
          <NumberInput
            value={element.h}
            min={1}
            onChange={(h) => update({ h: Math.max(1, h) })}
          />
        </Field>
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        <Field label="Stroke">
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={element.style.stroke}
              onChange={(event) => updateStyle({ stroke: event.target.value })}
              className="h-8 w-9 cursor-pointer rounded border border-input bg-background p-0.5"
              aria-label="Stroke color"
            />
          </div>
        </Field>

        {supportsFill ? (
          <ColorRow
            label="Fill"
            value={element.style.fill}
            onChange={(fill) => updateStyle({ fill })}
            onClear={() => updateStyle({ fill: "transparent" })}
          />
        ) : null}

        <Field label="Width">
          <input
            type="range"
            min={1}
            max={16}
            step={1}
            value={element.style.strokeWidth}
            onChange={(event) =>
              updateStyle({ strokeWidth: Number(event.target.value) })
            }
            className="w-28 accent-primary"
          />
        </Field>

        <Field label="Dash">
          <select
            value={element.style.dash}
            onChange={(event) =>
              updateStyle({
                dash: event.target.value as ElementStyle["dash"],
              })
            }
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </Field>

        {supportsRadius ? (
          <Field label="Radius">
            <input
              type="range"
              min={0}
              max={64}
              value={element.style.radius}
              onChange={(event) =>
                updateStyle({ radius: Number(event.target.value) })
              }
              className="w-28 accent-primary"
            />
          </Field>
        ) : null}

        {element.type === "text" ? (
          <Field label="Font">
            <input
              type="range"
              min={10}
              max={96}
              value={element.style.fontSize}
              onChange={(event) =>
                updateStyle({ fontSize: Number(event.target.value) })
              }
              className="w-28 accent-primary"
            />
          </Field>
        ) : null}

        <Field label="Opacity">
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(element.opacity * 100)}
            onChange={(event) =>
              update({ opacity: Number(event.target.value) / 100 })
            }
            className="w-28 accent-primary"
          />
        </Field>

        <Field label="Angle">
          <input
            type="range"
            min={0}
            max={360}
            value={element.angle}
            onChange={(event) => update({ angle: Number(event.target.value) })}
            className="w-28 accent-primary"
          />
        </Field>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5 text-xs")}
          onClick={() => update({ order: orderAtEnd(allOrders) })}
        >
          <ArrowUpToLine className="h-3.5 w-3.5" />
          Front
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => update({ order: orderBetween(null, minOrder) })}
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Back
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={duplicateSelected}
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs text-destructive hover:text-destructive"
          onClick={() => removeElements(selectedIds)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </aside>
  );
}
