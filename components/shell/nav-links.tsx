"use client";

import { Bookmark, BriefcaseBusiness, Compass, Home, LayoutDashboard, LogIn, Shield, Sparkles, Store } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: "home" | "explore" | "hire" | "match" | "saved" | "studio" | "join" | "admin" | "login" };

const ICONS = { home: Home, explore: Compass, hire: BriefcaseBusiness, match: Sparkles, saved: Bookmark, studio: LayoutDashboard, join: Store, admin: Shield, login: LogIn };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="grid gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] hover:bg-muted", active && "font-bold")}
            >
              <Icon className={cn("size-6", active && "stroke-[2.5]")} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground", active && "text-foreground")}
            >
              <Icon className={cn("size-6", active && "stroke-[2.5]")} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
