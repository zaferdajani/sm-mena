import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star row. Screen readers get the number. */
export function Stars({ value, size = "size-4", className }: { value: number; size?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(size, n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/40")}
        />
      ))}
    </span>
  );
}

export function RatingBadge({ average, count, label }: { average: number; count: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm" data-testid="rating-badge">
      <Star aria-hidden className="size-4 fill-amber-400 text-amber-400" />
      <span className="font-semibold tabular-nums">{average.toFixed(1)}</span>
      <span className="text-muted-foreground">({count}){label ? ` ${label}` : ""}</span>
    </span>
  );
}
