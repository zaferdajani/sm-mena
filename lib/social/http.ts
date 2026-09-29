import "server-only";

// Calls to the platforms' official APIs only (docs/53): an allowlist of hosts,
// HTTPS, no redirects, a time limit and a size limit. Responses are data, never
// instructions; callers validate every field they keep. Nothing here logs a
// request or response body (tokens and personal data stay out of logs).
const ALLOWED_HOSTS = new Set([
  "oauth2.googleapis.com",
  "openidconnect.googleapis.com",
  "www.googleapis.com",
  "youtube.googleapis.com",
  "api.instagram.com",
  "graph.instagram.com",
  "graph.facebook.com",
  "open.tiktokapis.com",
]);
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 1_000_000;

export type ProviderErrorCode = "denied" | "expired" | "permission" | "quota" | "unavailable" | "invalid";
export class ProviderError extends Error {
  constructor(public code: ProviderErrorCode, public status = 0) {
    super(`provider ${code}${status ? ` (${status})` : ""}`);
  }
}

/** Test seam: unit tests replace the network with fixtures. */
let transport: typeof fetch = (input, init) => fetch(input, init);
export function setSocialTransport(next: typeof fetch | null) {
  transport = next ?? ((input, init) => fetch(input, init));
}

export function assertAllowed(url: string): URL {
  const u = new URL(url);
  if (u.protocol !== "https:" || !ALLOWED_HOSTS.has(u.hostname) || u.username || u.password || u.port) throw new ProviderError("invalid");
  return u;
}

type Init = { method?: "GET" | "POST" | "DELETE"; token?: string; form?: Record<string, string>; json?: unknown; headers?: Record<string, string> };

/** JSON from an allowlisted provider endpoint, or a ProviderError with a safe code. */
export async function providerJson<T = Record<string, unknown>>(url: string, init: Init = {}): Promise<T> {
  const u = assertAllowed(url);
  const headers: Record<string, string> = { accept: "application/json", ...init.headers };
  let body: string | undefined;
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  if (init.form) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(init.form).toString();
  } else if (init.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await transport(u.toString(), { method: init.method ?? (body ? "POST" : "GET"), headers, body, redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new ProviderError("unavailable");
  }
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) throw new ProviderError("invalid", res.status);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new ProviderError("invalid", res.status);
  if (res.status === 429) throw new ProviderError("quota", 429);
  if (res.status === 401) throw new ProviderError("expired", 401);
  if (res.status === 403) throw new ProviderError(/quota/i.test(text) ? "quota" : "permission", 403);
  if (res.status >= 500) throw new ProviderError("unavailable", res.status);
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new ProviderError("invalid", res.status);
  }
  if (!res.ok) throw new ProviderError(res.status === 400 ? "invalid" : "permission", res.status);
  if (!data || typeof data !== "object") throw new ProviderError("invalid", res.status);
  return data as T;
}

/** A bounded, trimmed string from untrusted provider data. */
export const str = (value: unknown, max = 300): string => (typeof value === "string" ? value.trim().slice(0, max) : "");
/** A provider id: digits, letters, _ and - only (kept as a string, never a JS number). */
export const providerId = (value: unknown): string | null => {
  const s = typeof value === "number" ? null : str(value, 128);
  return s && /^[A-Za-z0-9_-]+$/.test(s) ? s : null;
};
/** An https URL on one of the given hosts (thumbnails, permalinks), else null. */
export function safeUrl(value: unknown, hosts: RegExp): string | null {
  const s = str(value, 2000);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" && hosts.test(u.hostname) && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}
