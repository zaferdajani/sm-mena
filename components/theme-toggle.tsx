"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const THEME_KEY = "sw_theme";

/**
 * Runs in <head> before the first paint: applies a saved dark choice so the
 * page doesn't flash. Everyone else gets the light theme, whatever the phone
 * is set to.
 */
export const themeScript = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

/** Light by default; a tap switches to dark and the choice is remembered on this device. */
export function ThemeToggle({ labels, className, withText = false }: { labels: { dark: string; light: string }; className?: string; withText?: boolean }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    // Read what the head script applied (it runs before React).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);
  const toggle = () => {
    // From the page itself, not state: a tap right after load must not act on a stale value.
    const next = document.documentElement.dataset.theme !== "dark";
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      if (next) localStorage.setItem(THEME_KEY, "dark");
      else localStorage.removeItem(THEME_KEY);
    } catch {
      // Private mode: the choice lasts for this page only.
    }
  };
  const label = dark ? labels.light : labels.dark;
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} aria-pressed={dark} className={cn("flex items-center gap-2 rounded-md p-2 text-muted-foreground hover:bg-muted", className)} data-testid="theme-toggle">
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      {withText && <span className="text-xs">{label}</span>}
    </button>
  );
}
