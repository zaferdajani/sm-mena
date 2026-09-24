"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function StudioNav({ items }: { items: { href: string; label: string; badge?: number }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b px-2 [scrollbar-width:none]">
      {items.map((item) => {
        // The first tab is the section root (/studio, /admin): active only on its own page.
        const active = item.href === items[0].href ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-sm text-muted-foreground", active && "border-foreground font-semibold text-foreground")}
          >
            {item.label}
            {item.badge ? <span className="rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">{item.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
