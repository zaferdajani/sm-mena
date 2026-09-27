"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme";
import { cn } from "@/lib/utils";

function currentTheme() {
  return document.documentElement.dataset.theme === "dark";
}
const serverTheme = () => false;
function subscribeTheme(onChange: () => void) {
  // Header and footer controls observe the same state, including bootstrap,
  // route reconciliation and changes made by the other toggle.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Light by default; explicit dark mode persists on this device. */
export function ThemeToggle({ labels, className, withText = false }: { labels: { dark: string; light: string }; className?: string; withText?: boolean }) {
  const dark = useSyncExternalStore(subscribeTheme, currentTheme, serverTheme);
  const toggle = () => {
    const next = !currentTheme();
    if (next) document.documentElement.dataset.theme = "dark";
    else document.documentElement.removeAttribute("data-theme");
    try {
      if (next) localStorage.setItem(THEME_KEY, "dark");
      else localStorage.removeItem(THEME_KEY);
    } catch {
      // Private mode: a choice still works for this page.
    }
  };
  const label = dark ? labels.light : labels.dark;
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} aria-pressed={dark} className={cn("flex min-h-11 items-center gap-2 rounded-md p-2 text-muted-foreground hover:bg-muted", className)} data-testid="theme-toggle">
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      {withText && <span className="text-xs">{label}</span>}
    </button>
  );
}
