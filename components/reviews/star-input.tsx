"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Accessible 1–5 star radio group. */
export function StarInput({ name, label, required = false, size = "size-8" }: { name: string; label: string; required?: boolean; size?: string }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  return (
    <fieldset className="grid gap-1">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="flex gap-1" dir="ltr" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} required={required && n === 1} className="peer sr-only" onChange={() => setValue(n)} data-testid={`${name}-${n}`} />
            <Star aria-hidden className={cn(size, "transition-colors peer-focus-visible:ring-2", n <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50")} />
            <span className="sr-only">{n}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
