import { ChevronDown, Copy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isBoxShape,
  isTextShape,
  shapeLabel,
} from "@/features/canvas/lib/dgm";
import { useEditorStore } from "@/features/canvas/store/editor-store";
import { cn } from "@/lib/utils";
import type { Page, PageBackground } from "@/types/models";
import type { Shape } from "@dgmjs/core";
import type { ShapeProps } from "@dgmjs/core";

interface InspectorPanelProps {
  open: boolean;
  page: Page;
  onUpdatePage: (patch: {
    name?: string;
    width?: number;
    height?: number;
    background?: PageBackground;
  }) => void;
}

function commonValue<T>(shapes: Shape[], key: string): T | undefined {
  if (!shapes.length) return undefined;
  const record = shapes[0] as unknown as Record<string, unknown>;
  const first = record[key] as T;
  const firstValue = JSON.stringify(first);
  return shapes.every(
    (shape) =>
      JSON.stringify((shape as unknown as Record<string, unknown>)[key]) ===
      firstValue
  )
    ? first
    : undefined;
}

function toHex(value: string | undefined, fallback: string): string {
  if (!value || value.startsWith("$")) return fallback;
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export function InspectorPanel({
  open,
  page,
  onUpdatePage,
}: InspectorPanelProps) {
  const [tab, setTab] = useState<"basic" | "expert">("basic");
  const selection = useEditorStore((state) => state.selection);
  const revision = useEditorStore((state) => state.revision);
  const editor = useEditorStore((state) => state.editor);

  const shapes = useMemo(() => {
    void revision;
    return selection;
  }, [selection, revision]);

  return (
    <aside
      className={cn(
        "fixed bottom-3 right-3 top-[70px] z-20 flex w-60 flex-col overflow-hidden rounded-xl border border-border bg-background/95 shadow-md backdrop-blur transition-transform duration-200 ease-linear",
        open ? "translate-x-0" : "translate-x-[calc(100%+1rem)]"
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-1 border-b px-2">
        <button
          type="button"
          onClick={() => setTab("basic")}
          className={cn(
            "flex flex-1 items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold transition",
            tab === "basic"
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-accent"
          )}
        >
          Basic
        </button>
        <button
          type="button"
          onClick={() => setTab("expert")}
          className={cn(
            "flex flex-1 items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold transition",
            tab === "expert"
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-accent"
          )}
        >
          Expert
        </button>
      </div>

      <div className="thin-scrollbar flex-1 overflow-y-auto">
        {shapes.length === 0 ? (
          <PageInspector page={page} onUpdatePage={onUpdatePage} />
        ) : tab === "basic" ? (
          <ShapeInspector shapes={shapes} editor={editor} />
        ) : (
          <ExpertInspector shapes={shapes} />
        )}
      </div>
    </aside>
  );
}

function PageInspector({
  page,
  onUpdatePage,
}: {
  page: Page;
  onUpdatePage: InspectorPanelProps["onUpdatePage"];
}) {
  const editor = useEditorStore((state) => state.editor);
  const showGrid = useEditorStore((state) => state.showGrid);
  const setShowGrid = useEditorStore((state) => state.setShowGrid);
  const [name, setName] = useState(page.name);

  useEffect(() => {
    setName(page.name);
  }, [page.id, page.name]);

  const currentSize = (() => {
    const current = editor?.getCurrentPage();
    if (current && Array.isArray(current.size)) {
      return current.size;
    }
    return [page.width, page.height];
  })();

  return (
    <div className="space-y-1 pb-20">
      <Section title="Page" open>
        <Field label="Name">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => {
              const trimmed = name.trim();
              if (trimmed && trimmed !== page.name) {
                onUpdatePage({ name: trimmed });
                const current = editor?.getCurrentPage();
                if (current) current.name = trimmed;
              }
            }}
            className="h-7 w-32 text-xs"
          />
        </Field>
        <Field label="Width">
          <NumberInput
            value={currentSize[0] ?? page.width}
            onChange={(width) => {
              const next = Math.max(200, width);
              onUpdatePage({ width: next });
              const current = editor?.getCurrentPage();
              if (current) {
                current.size = [next, currentSize[1] ?? page.height];
                editor?.repaint();
              }
            }}
          />
        </Field>
        <Field label="Height">
          <NumberInput
            value={currentSize[1] ?? page.height}
            onChange={(height) => {
              const next = Math.max(200, height);
              onUpdatePage({ height: next });
              const current = editor?.getCurrentPage();
              if (current) {
                current.size = [currentSize[0] ?? page.width, next];
                editor?.repaint();
              }
            }}
          />
        </Field>
      </Section>

      <Section title="Background" open>
        <Field label="Type">
          <select
            value={page.background.type}
            onChange={(event) => {
              const type = event.target.value as PageBackground["type"];
              onUpdatePage({
                background: { ...page.background, type },
              });
              editor?.setShowGrid(type !== "solid");
              setShowGrid(type !== "solid");
            }}
            className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
          >
            <option value="solid">Solid</option>
            <option value="grid">Grid</option>
            <option value="dots">Dots</option>
          </select>
        </Field>
        <Field label="Color">
          <input
            type="color"
            value={toHex(page.background.color, "#ffffff")}
            onChange={(event) => {
              const color = event.target.value;
              onUpdatePage({
                background: {
                  ...page.background,
                  color,
                },
              });
              if (editor) {
                editor.options.canvasColor = color;
                editor.repaint();
              }
            }}
            className="h-7 w-8 cursor-pointer rounded border border-input bg-background p-0.5"
            aria-label="Page background color"
          />
        </Field>
        <label className="flex items-center justify-between py-1 text-xs text-muted-foreground">
          <span>Show grid</span>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(event) => {
              editor?.setShowGrid(event.target.checked);
              setShowGrid(event.target.checked);
            }}
            className="accent-primary"
          />
        </label>
      </Section>

      <div className="px-4 pt-2 text-xs leading-relaxed text-muted-foreground">
        Select a shape to edit its properties. Use the toolbar at the bottom to
        draw.
      </div>
    </div>
  );
}

function ShapeInspector({
  shapes,
  editor,
}: {
  shapes: Shape[];
  editor: ReturnType<typeof useEditorStore.getState>["editor"];
}) {
  const add = (props: ShapeProps) => {
    if (!editor) return;
    editor.actions.update(props, shapes);
    editor.repaint();
  };

  const fillStyle = commonValue<string>(shapes, "fillStyle");
  const strokePattern = commonValue<number[]>(shapes, "strokePattern");
  const corners = commonValue<number[]>(shapes, "corners");
  const textShape = shapes.find(isTextShape);
  const boxShape = shapes.find(isBoxShape);
  const lineShape = shapes.find(
    (shape) => shape.type === "Line" || shape.type === "Connector"
  );

  return (
    <div className="space-y-1 pb-20">
      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <p className="truncate text-xs font-semibold">
          {shapes.length === 1 ? shapeLabel(shapes[0]) : `${shapes.length} selected`}
        </p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
          {shapes.length === 1 ? shapes[0].type : "mixed"}
        </span>
      </div>

      <Section title="Position" open>
        <div className="grid grid-cols-2 gap-2 px-4 pb-2">
          <CompactNumber
            label="X"
            value={commonValue<number>(shapes, "left")}
            onChange={(left) => add({ left })}
          />
          <CompactNumber
            label="Y"
            value={commonValue<number>(shapes, "top")}
            onChange={(top) => add({ top })}
          />
          <CompactNumber
            label="W"
            value={commonValue<number>(shapes, "width")}
            min={1}
            onChange={(width) => add({ width: Math.max(1, width) })}
          />
          <CompactNumber
            label="H"
            value={commonValue<number>(shapes, "height")}
            min={1}
            onChange={(height) => add({ height: Math.max(1, height) })}
          />
        </div>
        <Field label="Rotate">
          <NumberInput
            value={commonValue<number>(shapes, "rotate") ?? 0}
            onChange={(rotate) => add({ rotate })}
          />
        </Field>
        <Field label="Opacity">
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round((commonValue<number>(shapes, "opacity") ?? 1) * 100)}
            onChange={(event) => add({ opacity: Number(event.target.value) / 100 })}
            className="w-28 accent-primary"
          />
        </Field>
      </Section>

      <Section title="Stroke" open>
        <Field label="Color">
          <input
            type="color"
            value={toHex(commonValue<string>(shapes, "strokeColor"), "#0f172a")}
            onChange={(event) => add({ strokeColor: event.target.value })}
            className="h-7 w-8 cursor-pointer rounded border border-input bg-background p-0.5"
          />
        </Field>
        <Field label="Width">
          <input
            type="range"
            min={0}
            max={16}
            value={commonValue<number>(shapes, "strokeWidth") ?? 2}
            onChange={(event) => add({ strokeWidth: Number(event.target.value) })}
            className="w-28 accent-primary"
          />
        </Field>
        <Field label="Pattern">
          <select
            value={JSON.stringify(strokePattern ?? [])}
            onChange={(event) =>
              add({ strokePattern: JSON.parse(event.target.value) as number[] })
            }
            className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
          >
            <option value="[]">Solid</option>
            <option value="[10,6]">Dashed</option>
            <option value="[2,5]">Dotted</option>
          </select>
        </Field>
        <Field label="Rough">
          <input
            type="range"
            min={0}
            max={3}
            step={0.5}
            value={commonValue<number>(shapes, "roughness") ?? 1}
            onChange={(event) => add({ roughness: Number(event.target.value) })}
            className="w-28 accent-primary"
          />
        </Field>
      </Section>

      {boxShape ? (
        <Section title="Fill" open>
          <Field label="Color">
            <input
              type="color"
              value={toHex(commonValue<string>(shapes, "fillColor"), "#ffffff")}
              onChange={(event) => add({ fillColor: event.target.value })}
              className="h-7 w-8 cursor-pointer rounded border border-input bg-background p-0.5"
            />
          </Field>
          <Field label="Style">
            <select
              value={fillStyle ?? "none"}
              onChange={(event) =>
                add({ fillStyle: event.target.value as ShapeProps["fillStyle"] })
              }
              className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
            >
              <option value="none">None</option>
              <option value="solid">Solid</option>
              <option value="hachure">Hachure</option>
              <option value="cross-hatch">Cross hatch</option>
            </select>
          </Field>
          <Field label="Corners">
            <input
              type="range"
              min={0}
              max={64}
              value={corners?.[0] ?? 0}
              onChange={(event) =>
                add({
                  corners: [
                    Number(event.target.value),
                    Number(event.target.value),
                    Number(event.target.value),
                    Number(event.target.value),
                  ],
                })
              }
              className="w-28 accent-primary"
            />
          </Field>
        </Section>
      ) : null}

      {textShape ? (
        <Section title="Text" open>
          <Field label="Font">
            <select
              value={commonValue<string>(shapes, "fontFamily") ?? "Inter"}
              onChange={(event) => add({ fontFamily: event.target.value })}
              className="h-7 w-28 rounded-md border border-input bg-background px-1.5 text-xs"
            >
              <option value="Inter">Inter</option>
              <option value="Gloria Hallelujah">Gloria</option>
              <option value="IBM Plex Mono">IBM Plex</option>
              <option value="Source Serif Pro">Serif</option>
            </select>
          </Field>
          <Field label="Size">
            <NumberInput
              value={commonValue<number>(shapes, "fontSize") ?? 16}
              min={6}
              onChange={(fontSize) =>
                add({ fontSize: Math.max(6, fontSize) })
              }
            />
          </Field>
          <Field label="Color">
            <input
              type="color"
              value={toHex(commonValue<string>(shapes, "fontColor"), "#0f172a")}
              onChange={(event) => add({ fontColor: event.target.value })}
              className="h-7 w-8 cursor-pointer rounded border border-input bg-background p-0.5"
            />
          </Field>
          <Field label="Align">
            <select
              value={commonValue<string>(shapes, "horzAlign") ?? "left"}
              onChange={(event) =>
                add({ horzAlign: event.target.value as ShapeProps["horzAlign"] })
              }
              className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <Field label="Vertical">
            <select
              value={commonValue<string>(shapes, "vertAlign") ?? "top"}
              onChange={(event) =>
                add({ vertAlign: event.target.value as ShapeProps["vertAlign"] })
              }
              className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
            >
              <option value="top">Top</option>
              <option value="middle">Middle</option>
              <option value="bottom">Bottom</option>
            </select>
          </Field>
          <Field label="Style">
            <div className="flex gap-1">
              <Button
                variant={
                  commonValue<string>(shapes, "fontStyle") === "italic"
                    ? "secondary"
                    : "outline"
                }
                size="sm"
                className="h-7 px-2 text-xs italic"
                onClick={() =>
                  add({
                    fontStyle:
                      commonValue<string>(shapes, "fontStyle") === "italic"
                        ? "normal"
                        : "italic",
                  })
                }
              >
                I
              </Button>
              <Button
                variant={
                  commonValue<number>(shapes, "fontWeight") === 700
                    ? "secondary"
                    : "outline"
                }
                size="sm"
                className="h-7 px-2 text-xs font-bold"
                onClick={() =>
                  add({
                    fontWeight:
                      commonValue<number>(shapes, "fontWeight") === 700
                        ? 400
                        : 700,
                  })
                }
              >
                B
              </Button>
            </div>
          </Field>
        </Section>
      ) : null}

      {lineShape ? (
        <Section title="Line" open>
          <Field label="Type">
            <select
              value={commonValue<string>(shapes, "lineType") ?? "straight"}
              onChange={(event) =>
                add({ lineType: event.target.value as ShapeProps["lineType"] })
              }
              className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
            >
              <option value="straight">Straight</option>
              <option value="curve">Curve</option>
            </select>
          </Field>
          <Field label="Start">
            <ArrowEndSelect
              value={commonValue<string>(shapes, "tailEndType") ?? "flat"}
              onChange={(tailEndType) =>
                add({ tailEndType: tailEndType as ShapeProps["tailEndType"] })
              }
            />
          </Field>
          <Field label="End">
            <ArrowEndSelect
              value={commonValue<string>(shapes, "headEndType") ?? "flat"}
              onChange={(headEndType) =>
                add({ headEndType: headEndType as ShapeProps["headEndType"] })
              }
            />
          </Field>
        </Section>
      ) : null}

      <Section title="Shadow" open={false}>
        <label className="flex items-center justify-between px-4 py-1 text-xs text-muted-foreground">
          <span>Enabled</span>
          <input
            type="checkbox"
            checked={Boolean(commonValue<boolean>(shapes, "shadow"))}
            onChange={(event) => add({ shadow: event.target.checked })}
            className="accent-primary"
          />
        </label>
      </Section>

      <div className="grid grid-cols-2 gap-2 px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => {
            editor?.actions.duplicate();
            editor?.repaint();
          }}
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs text-destructive hover:text-destructive"
          onClick={() => {
            editor?.actions.remove();
            editor?.repaint();
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function ExpertInspector({ shapes }: { shapes: Shape[] }) {
  const shape = shapes[0];
  let json = "{}";
  try {
    json = JSON.stringify(shape.toJSON(false, false, true), null, 2);
  } catch {
    json = "{}";
  }

  return (
    <div className="space-y-1 pb-20">
      <div className="px-4 pb-1 pt-3 text-xs font-semibold">
        {shapes.length === 1 ? shapeLabel(shape) : `${shapes.length} selected`}
      </div>
      <Section title="Metadata" open>
        <Field label="Id">
          <code className="max-w-[7rem] truncate rounded bg-muted px-1.5 py-1 text-[10px]">
            {shape.id}
          </code>
        </Field>
        <Field label="Type">
          <span className="text-xs">{shape.type}</span>
        </Field>
        <Field label="Tags">
          <Input
            value={shape.tags.join(", ")}
            onChange={(event) => {
              const tags = event.target.value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean);
              useEditorStore.getState().editor?.actions.update(
                { tags },
                shapes
              );
            }}
            className="h-7 w-32 text-xs"
          />
        </Field>
        <Field label="Link">
          <Input
            value={shape.link ?? ""}
            onChange={(event) => {
              useEditorStore.getState().editor?.actions.update(
                { link: event.target.value },
                shapes
              );
            }}
            className="h-7 w-32 text-xs"
          />
        </Field>
        <label className="flex items-center justify-between px-4 py-1 text-xs text-muted-foreground">
          <span>Visible</span>
          <input
            type="checkbox"
            checked={commonValue<boolean>(shapes, "visible") ?? true}
            onChange={(event) => {
              useEditorStore
                .getState()
                .editor?.actions.update({ visible: event.target.checked }, shapes);
            }}
            className="accent-primary"
          />
        </label>
        <label className="flex items-center justify-between px-4 py-1 text-xs text-muted-foreground">
          <span>Editable</span>
          <input
            type="checkbox"
            checked={commonValue<boolean>(shapes, "enable") ?? true}
            onChange={(event) => {
              useEditorStore
                .getState()
                .editor?.actions.update({ enable: event.target.checked }, shapes);
            }}
            className="accent-primary"
          />
        </label>
      </Section>
      <Section title="JSON" open>
        <pre className="mx-3 mb-3 max-h-64 overflow-auto rounded-md bg-muted p-2 text-[10px] leading-relaxed">
          {json}
        </pre>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
  open: initialOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div className="border-t border-border/60 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-full items-center justify-between px-4 text-[11px] font-semibold text-foreground"
      >
        {title}
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-muted-foreground", !open && "-rotate-90")}
        />
      </button>
      {open ? <div className="space-y-1 pb-2">{children}</div> : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center justify-between gap-2 px-4 py-1 text-xs text-muted-foreground">
      <span className="w-16 shrink-0">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
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
      className="h-7 w-20 text-right text-xs"
    />
  );
}

function CompactNumber({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
}) {
  return (
    <label className="flex items-center gap-1 rounded-md border border-input bg-background px-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value === undefined ? "" : Math.round(value * 100) / 100}
        min={min}
        placeholder="—"
        onChange={(event) => {
          const next = Number(event.target.value);
          if (!Number.isNaN(next)) onChange(next);
        }}
        className="h-7 w-full min-w-0 bg-transparent text-right text-xs outline-none"
      />
    </label>
  );
}

function ArrowEndSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
    >
      <option value="flat">None</option>
      <option value="arrow">Arrow</option>
      <option value="solid-arrow">Solid arrow</option>
      <option value="triangle">Triangle</option>
      <option value="triangle-filled">Filled triangle</option>
      <option value="diamond">Diamond</option>
      <option value="circle">Circle</option>
    </select>
  );
}
