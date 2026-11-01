import { cn } from "@/lib/utils";

/** A clear "Paid" / "Free" label next to anything that costs money (App Store 3.1.1 / 3.1.2 clarity). */
export function PriceBadge({ paid, label, className }: { paid: boolean; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        paid ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-brand/10 text-brand",
        className,
      )}
      data-testid={paid ? "badge-paid" : "badge-free"}
    >
      {label}
    </span>
  );
}
