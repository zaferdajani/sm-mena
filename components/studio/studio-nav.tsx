"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; badge?: number };

/**
 * Four tabs fit a phone (docs/65); everything else sits under "More" and is still one tap away. A section
 * with news (a badge) is promoted to its own tab by the caller.
 */
export function StudioNav({ items, more = [], moreLabel = "…" }: { items: NavItem[]; more?: NavItem[]; moreLabel?: string }) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const isActive = (item: NavItem) => (item.href === items[0]?.href ? pathname === item.href : pathname.startsWith(item.href));
  const moreActive = more.some(isActive) && !items.some(isActive);
  const moreBadge = more.reduce((n, i) => n + (i.badge ?? 0), 0);
  useEffect(() => {
    nav.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
    if (details.current) details.current.open = false;
  }, [pathname]);
  const tab = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={isActive(item) ? "page" : undefined}
      className={cn("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-sm text-muted-foreground", isActive(item) && "border-foreground font-semibold text-foreground")}
    >
      {item.label}
      {item.badge ? <span className="rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white" data-testid="nav-badge">{item.badge}</span> : null}
    </Link>
  );
  return (
    <nav ref={nav} className="sw-workspace-nav relative flex gap-1 overflow-x-auto border-b px-2 [scrollbar-width:none]" data-testid="studio-nav">
      {items.map(tab)}
      {more.length > 0 && (
        <details ref={details} className="relative shrink-0" data-testid="studio-more">
          <summary className={cn("-mb-px flex min-h-11 cursor-pointer list-none items-center gap-1 border-b-2 border-transparent px-3 py-3 text-sm text-muted-foreground [&::-webkit-details-marker]:hidden", moreActive && "border-foreground font-semibold text-foreground")}>
            {moreLabel}
            {moreBadge ? <span className="rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white" data-testid="nav-badge">{moreBadge}</span> : null}
            <ChevronDown className="size-4" aria-hidden />
          </summary>
          <div className="absolute end-0 top-full z-20 mt-1 grid min-w-56 gap-0.5 rounded-xl border bg-background p-2 shadow-lg">
            {more.map((item) => (
              <Link key={item.href} href={item.href} aria-current={isActive(item) ? "page" : undefined} className={cn("flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-sm hover:bg-muted", isActive(item) && "font-semibold")}>
                {item.label}
                {item.badge ? <span className="rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">{item.badge}</span> : null}
              </Link>
            ))}
          </div>
        </details>
      )}
    </nav>
  );
}
