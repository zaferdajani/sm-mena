import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Filter pills that set one search param (plus any params to keep). */
export function FilterChips({ param, current, options, keep = {} }: { param: string; current: string; options: { value: string; label: string }[]; keep?: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((o) => (
        <Link
          key={o.value}
          href={{ query: { ...keep, [param]: o.value } }}
          aria-current={o.value === current ? "true" : undefined}
          className={cn("rounded-full border px-3 py-1 text-sm", o.value === current ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
