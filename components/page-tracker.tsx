"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";

// First-party page-view counter for Admin → Statistics. Sends the path, where
// the visit came from (UTM source or referring site, first page only), a
// per-tab session id and the time zone. No cookies of its own, no third parties.
function sessionId() {
  try {
    let id = sessionStorage.getItem("sw_sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("sw_sid", id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

export function PageTracker() {
  const pathname = usePathname();
  const locale = useLocale();
  const first = useRef(true);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_TRACK_DEV) return;
    if (/^\/(admin|studio)(\/|$)/.test(pathname)) return; // staff and agency back-office pages aren't traffic
    const landing = first.current;
    first.current = false;
    const params = new URLSearchParams(location.search);
    const body = JSON.stringify({
      path: pathname,
      locale,
      landing,
      utm: landing ? params.get("utm_source") : null,
      referrer: landing ? document.referrer || null : null,
      sessionId: sessionId(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    });
    fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, [pathname, locale]);
  return null;
}
