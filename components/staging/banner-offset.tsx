"use client";

import { useLayoutEffect } from "react";

/** Keeps fixed and sticky headers below the staging banner so they stay clickable. */
export function StagingBannerOffset() {
  useLayoutEffect(() => {
    const banner = document.querySelector<HTMLElement>("[data-testid=staging-banner]");
    if (!banner) return;
    const apply = () => {
      document.documentElement.style.setProperty("--staging-banner-h", `${banner.getBoundingClientRect().height}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--staging-banner-h");
    };
  }, []);
  return null;
}
