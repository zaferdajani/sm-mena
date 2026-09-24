"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;

/**
 * Notification bell: the server renders the first count, then it polls
 * /api/notifications/count every minute while the tab is visible (and after
 * each navigation, so opening the list clears the badge).
 */
export function NotificationBell({ initialCount, href, variant = "icon" }: { initialCount: number; href: "/notifications" | "/studio/notifications"; variant?: "icon" | "row" }) {
  const t = useTranslations("Notifications");
  const pathname = usePathname();
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/notifications/count", { cache: "no-store" });
        if (res.ok) setCount(((await res.json()) as { count: number }).count);
      } catch {
        // offline: keep the last count
      }
    };
    const start = () => {
      clearInterval(timer);
      timer = setInterval(refresh, POLL_MS);
    };
    const onVisibility = () => {
      if (document.hidden) clearInterval(timer);
      else {
        void refresh();
        start();
      }
    };
    void refresh();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  const label = count ? t("bellUnread", { count }) : t("bell");
  const badge = count ? (
    <span className={cn("rounded-full bg-destructive text-[10px] leading-4 font-bold text-white", variant === "icon" ? "absolute -end-0.5 -top-0.5 min-w-4 px-1 text-center" : "px-1.5")} data-testid="bell-count">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

  if (variant === "row") {
    return (
      <Link href={href} aria-label={label} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] hover:bg-muted" data-testid="notification-bell">
        <span className="relative">
          <Bell className="size-6" />
        </span>
        {t("bell")}
        {badge}
      </Link>
    );
  }
  return (
    <Link href={href} aria-label={label} className="relative shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted" data-testid="notification-bell">
      <Bell className="size-5" />
      {badge}
    </Link>
  );
}
