import { cn } from "@/lib/utils";

/** A group of checkbox chips submitted as repeated form fields. */
export function ChipGroup({
  name,
  options,
  defaultValues = [],
  className,
  type = "checkbox",
}: {
  name: string;
  options: { key: string; label: string }[];
  defaultValues?: string[];
  className?: string;
  type?: "checkbox" | "radio";
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => (
        <label key={o.key} className="cursor-pointer">
          <input type={type} name={name} value={o.key} defaultChecked={defaultValues.includes(o.key)} className="peer sr-only" />
          <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
