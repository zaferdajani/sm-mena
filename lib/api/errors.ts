/**
 * The error contract every JSON API (today's routes, tomorrow's /api/v1) and every client-facing
 * `{ error }` result share (docs/architecture/mobile-and-api-roadmap.md §4.2). Pure TypeScript: no
 * framework import, so a native client can depend on the same codes. Messages never leave the
 * server; clients translate `code` + `reason`.
 */
export const API_ERROR_CODES = [
  "unauthenticated",
  "mfa_required",
  "forbidden",
  "not_found",
  "invalid",
  "stale",
  "conflict",
  "rate_limited",
  "unavailable",
  "upgrade_required",
  "internal",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type ApiError = {
  error: {
    code: ApiErrorCode;
    /** Machine detail from the domain, e.g. a SetupError such as "noServices"; never free text for people. */
    reason?: string;
    /** Validation issues by path only; values are never echoed back. */
    fields?: { path: string; issue: string }[];
    /** Seconds, with rate_limited. */
    retryAfter?: number;
  };
};

/** HTTP status per code. not_found is also used where the web already answers 404 to avoid existence leaks (private media, private pages). */
export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  unauthenticated: 401,
  mfa_required: 401,
  forbidden: 403,
  not_found: 404,
  invalid: 400,
  stale: 409,
  conflict: 409,
  rate_limited: 429,
  unavailable: 503,
  upgrade_required: 426,
  internal: 500,
};

export function apiError(code: ApiErrorCode, detail: Omit<ApiError["error"], "code"> = {}): ApiError {
  const error: ApiError["error"] = { code };
  if (detail.reason) error.reason = detail.reason;
  if (detail.fields?.length) error.fields = detail.fields.map((f) => ({ path: f.path, issue: f.issue }));
  if (detail.retryAfter !== undefined) error.retryAfter = Math.max(0, Math.ceil(detail.retryAfter));
  return { error };
}

export const isApiError = (value: unknown): value is ApiError =>
  typeof value === "object" && value !== null && "error" in value && typeof (value as ApiError).error?.code === "string" && (API_ERROR_CODES as readonly string[]).includes((value as ApiError).error.code);

/** Zod-style issues → paths and issue codes only. */
export function fieldsFromIssues(issues: { path: (string | number)[]; code: string }[]): ApiError["error"]["fields"] {
  return issues.map((i) => ({ path: i.path.join("."), issue: i.code }));
}
