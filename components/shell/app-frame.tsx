"use client";

import { usePathname } from "@/i18n/navigation";
import styles from "./app-frame.module.css";

/** Focus only the first-run task. Ordinary app navigation is unchanged on exit. */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const focused = usePathname() === "/portfolio-setup";
  return (
    <div className={`sw-app min-h-dvh md:flex ${focused ? styles.focused : ""}`}
      data-design-surface="app" data-onboarding-focused={focused ? "true" : undefined}>
      {children}
    </div>
  );
}
