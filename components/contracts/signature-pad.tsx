"use client";

/**
 * A drawn-signature pad for forms. Ported from TeamManager's SignatureCanvas
 * (src/components/patient-intake/SignatureCanvas.tsx), simplified: Pointer
 * Events (mouse, pen and touch alike), no colour or width pickers, and the
 * guide line and hint live in the DOM so they never end up in the image.
 *
 * The signature is posted as a PNG data URL in a hidden input named `name`
 * (empty while the pad is blank). The PNG is re-drawn at a fixed size on a
 * white background, so it stays small (well under the server's 200 KB cap in
 * lib/pdf/signature-image.ts) whatever the screen's pixel density.
 */
import { Eraser } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Point = { x: number; y: number };
type Stroke = Point[];

const INK = "#10214a";
const LINE_WIDTH = 2.4;
/** Exported image width in pixels; height follows the pad's aspect ratio. */
const EXPORT_WIDTH = 600;

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, scale: number) {
  if (stroke.length === 0) return;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = LINE_WIDTH * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (stroke.length === 1) {
    ctx.beginPath();
    ctx.arc(stroke[0].x * scale, stroke[0].y * scale, (LINE_WIDTH * scale) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(stroke[0].x * scale, stroke[0].y * scale);
  // Quadratic curves through the midpoints: smooth without a library.
  for (let i = 1; i < stroke.length - 1; i++) {
    const midX = (stroke[i].x + stroke[i + 1].x) / 2;
    const midY = (stroke[i].y + stroke[i + 1].y) / 2;
    ctx.quadraticCurveTo(stroke[i].x * scale, stroke[i].y * scale, midX * scale, midY * scale);
  }
  const last = stroke[stroke.length - 1];
  ctx.lineTo(last.x * scale, last.y * scale);
  ctx.stroke();
}

export function SignaturePad({
  name,
  label,
  clearLabel,
  hint,
  required = false,
  requiredMessage,
  onChange,
}: {
  name: string;
  label: string;
  clearLabel: string;
  /** Shown inside the empty pad, e.g. "Sign with your finger or mouse". */
  hint?: string;
  /** Blocks form submission while the pad is blank. */
  required?: boolean;
  /** Message the browser shows when a required pad is blank. */
  requiredMessage?: string;
  /** Called whenever the pad goes from blank to signed or back. */
  onChange?: (hasInk: boolean) => void;
}) {
  const labelId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const proxyRef = useRef<HTMLInputElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [dataUrl, setDataUrl] = useState("");
  const hasInk = dataUrl !== "";

  /** Redraws every stroke at the canvas's current size and pixel density. */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = canvas.width / Math.max(1, canvas.clientWidth);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes.current) drawStroke(ctx, stroke, dpr);
    if (current.current) drawStroke(ctx, current.current, dpr);
  }, []);

  // Keep the backing store at the displayed size × devicePixelRatio (sharp on
  // retina screens), and redraw after a resize wipes it.
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = box.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      redraw();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [redraw]);

  // A blank required pad keeps the (invisible) proxy input invalid, so the
  // browser refuses to submit and points at the pad.
  useEffect(() => {
    proxyRef.current?.setCustomValidity(!hasInk && requiredMessage ? requiredMessage : "");
  }, [hasInk, requiredMessage]);

  const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.current.length === 0) return "";
    const cssWidth = Math.max(1, canvas.clientWidth);
    const scale = EXPORT_WIDTH / cssWidth;
    const out = document.createElement("canvas");
    out.width = EXPORT_WIDTH;
    out.height = Math.max(1, Math.round(canvas.clientHeight * scale));
    const ctx = out.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    for (const stroke of strokes.current) drawStroke(ctx, stroke, scale);
    return out.toDataURL("image/png");
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    current.current = [pointFrom(event)];
    redraw();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current.current) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const events = event.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const e of events.length ? events : [event.nativeEvent]) {
      current.current.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    redraw();
  };

  const endStroke = () => {
    if (!current.current) return;
    strokes.current.push(current.current);
    current.current = null;
    redraw();
    const next = exportPng();
    if ((next !== "") !== hasInk) onChange?.(next !== "");
    setDataUrl(next);
  };

  const clear = () => {
    strokes.current = [];
    current.current = null;
    redraw();
    if (hasInk) onChange?.(false);
    setDataUrl("");
  };

  return (
    <div className="grid gap-1.5" data-testid="signature-pad">
      <div className="flex items-center justify-between gap-2">
        <span id={labelId} className="text-sm font-medium">
          {label}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasInk}>
          <Eraser /> {clearLabel}
        </Button>
      </div>
      <div
        ref={boxRef}
        className="relative h-40 touch-none overflow-hidden rounded-xl border-2 border-dashed border-brand/40 bg-background select-none"
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-labelledby={labelId}
          className="absolute inset-0 size-full cursor-crosshair touch-none"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onLostPointerCapture={endStroke}
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-muted-foreground/30" />
        {hint && !hasInk ? (
          <p className="pointer-events-none absolute inset-x-6 bottom-3 text-center text-xs text-muted-foreground">{hint}</p>
        ) : null}
        {required ? (
          <input
            ref={proxyRef}
            aria-hidden
            tabIndex={-1}
            required
            value={hasInk ? "signed" : ""}
            onChange={() => {}}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0"
          />
        ) : null}
      </div>
      <input type="hidden" name={name} value={dataUrl} />
    </div>
  );
}
