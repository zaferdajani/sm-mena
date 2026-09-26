import { Check, CircleHelp, Minus, X } from "lucide-react";
import type { DiffLine } from "@/lib/matching/describe-core";
import { cn } from "@/lib/utils";

// Shared by the server (Explore, hire pages) and the matchmaker's cards (browser).

const ICON = {
  met: <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />,
  partly: <Minus className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />,
  missing: <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />,
  unknown: <CircleHelp className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />,
} as const;

/** How well an agency fits, as a labelled bar. */
export function MatchMeter({ percent, label }: { percent: number; label: string }) {
  const tone = percent >= 75 ? "bg-brand" : percent >= 50 ? "bg-amber-500" : "bg-muted-foreground";
  return (
    <div className="flex items-center gap-2" data-testid="match-percent" data-percent={percent}>
      <span className="text-sm font-bold tabular-nums">{label}</span>
      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span className={cn("block h-full rounded-full", tone)} style={{ width: `${percent}%` }} />
      </span>
    </div>
  );
}

export function DiffList({ lines }: { lines: DiffLine[] }) {
  return (
    <ul className="grid gap-1 text-sm" data-testid="match-differences">
      {lines.map((l, i) => (
        <li key={i} className={cn("flex items-start gap-1.5", l.status === "met" ? "" : "text-muted-foreground")} data-status={l.status}>
          {ICON[l.status]}
          <span>{l.text}</span>
        </li>
      ))}
    </ul>
  );
}

