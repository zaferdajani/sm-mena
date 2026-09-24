"use client";

import { useEffect } from "react";

// Sends uncaught browser errors to /api/errors (Admin → Bugs). Production only,
// each distinct error once per page load, at most 25 per browser session.
const MAX_PER_SESSION = 25;
const sent = new Set<string>();

export function reportClientError(kind: string, message: string, stack?: string | null) {
  if (process.env.NODE_ENV !== "production" || typeof window === "undefined") return;
  const key = `${kind}|${message}`;
  if (sent.has(key)) return;
  sent.add(key);
  try {
    const n = Number(sessionStorage.getItem("sw_err_n") ?? 0);
    if (n >= MAX_PER_SESSION) return;
    sessionStorage.setItem("sw_err_n", String(n + 1));
  } catch {
    // storage blocked: still report, the server rate limits
  }
  const body = JSON.stringify({ kind, message: message.slice(0, 2000), stack: stack?.slice(0, 8000) ?? null, path: location.pathname });
  fetch("/api/errors", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
}

export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Cross-origin script errors carry no detail; skip them.
      if (!e.message || e.message === "Script error.") return;
      reportClientError("js_error", e.message, e.error instanceof Error ? e.error.stack : `${e.filename}:${e.lineno}:${e.colno}`);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      reportClientError("unhandled_rejection", r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : null);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
