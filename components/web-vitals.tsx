"use client";

import { useReportWebVitals } from "next/web-vitals";

// Stable callback; log numeric metrics only, never URLs, DOM entries or user data.
const logVitals: Parameters<typeof useReportWebVitals>[0] = ({ name, value, rating }) => {
  console.info("[web-vitals]", { name, value, rating });
};

export function WebVitals() {
  useReportWebVitals(logVitals);
  return null;
}
