import type { ApiClient } from "./api/client";

// Sends an uncaught JavaScript error to the server's error journal (POST /api/v1/errors, filed under Admin → Bugs)
// and then lets React Native's own handler run, so the usual red screen or crash still happens. Reports are
// best effort: a failed send is ignored, and a crash that kills the app before the send finishes is lost.
// Promise rejections are not hooked here; React Native does not expose them globally in a reliable way.
type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler(): GlobalErrorHandler | undefined; setGlobalHandler(handler: GlobalErrorHandler): void };

export function installCrashReporter(client: ApiClient, utils: ErrorUtilsLike | undefined = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils): () => void {
  if (!utils) return () => undefined;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    const err = error instanceof Error ? error : null;
    client.errors
      .report({ kind: "js_error", message: err?.message ?? String(error), stack: err?.stack ?? null, path: "/mobile" })
      .catch(() => undefined);
    previous?.(error, isFatal);
  });
  return () => utils.setGlobalHandler(previous as GlobalErrorHandler);
}
