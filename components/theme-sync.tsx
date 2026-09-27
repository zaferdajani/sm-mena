"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { THEME_KEY } from "@/lib/theme";

function applySavedTheme() {
  try {
    if (localStorage.getItem(THEME_KEY) === "dark") document.documentElement.dataset.theme = "dark";
    else document.documentElement.removeAttribute("data-theme");
  } catch {
    // When storage is unavailable, preserve the current page's chosen theme.
  }
}

/** Reconcile after streamed hydration, route changes, BFCache and another tab. */
export function ThemeSync() {
  const pathname = usePathname();
  useEffect(() => {
    applySavedTheme();
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) applySavedTheme();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", applySavedTheme);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", applySavedTheme);
    };
  }, [pathname]);
  return null;
}
