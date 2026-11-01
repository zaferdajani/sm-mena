// The mobile header and desktop sidebar coexist in the DOM. Share only a
// pending request, never a cached count that could survive an account change.
let pending: Promise<number | null> | undefined;

export function fetchNotificationCount(): Promise<number | null> {
  pending ??= fetch("/api/notifications/count", {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })
    .then(async (res) => res.ok ? ((await res.json()) as { count: number }).count : null)
    .finally(() => { pending = undefined; });
  return pending;
}
