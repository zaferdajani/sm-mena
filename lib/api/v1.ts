import "server-only";
import { apiV1Allowed } from "@/lib/core/rules/api-v1-environment";
import type { ZodError } from "zod";
import { bearerTokenFrom, clientIpFrom, requestContext } from "@/lib/core/rules/request-context";
import { authorizeAgency } from "@/lib/core/rules/auth/authorize";
import { adminAccess } from "@/lib/core/rules/auth/policy";
import { adminMfaRequired } from "@/lib/auth/mfa";
import { sessionUserByToken, type SessionUser } from "@/lib/auth/session-core";
import { getAgencyByOwner } from "@/lib/data/agencies";
import type { SetupError, SetupView } from "@/lib/data/portfolio-setup";
import type { Viewer } from "@/lib/data/publication";
import { API_ERROR_STATUS, apiError, fieldsFromIssues, type ApiError, type ApiErrorCode } from "./errors";
import { upgradeRequired } from "@/lib/core/rules/app-version";

// The bearer API's plumbing (docs/architecture/mobile-and-api-roadmap.md §4, §8). Three rules hold on every
// route: it exists only while API_V1_ENABLED is "true" on the server (off in production until the mobile
// beta), identity comes from the Authorization header and never from a cookie, and every answer is either
// data or the shared error contract.

export const apiV1Enabled = () => apiV1Allowed(process.env);

/** The oldest native app the API still serves (semver); unset accepts every app. Set it when a release breaks old clients. */
export const apiMinAppVersion = () => process.env.API_MIN_APP_VERSION?.trim() || null;

const baseHeaders = { "cache-control": "private, no-store", vary: "Authorization", "x-content-type-options": "nosniff", "x-robots-tag": "noindex" };

export function json(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return Response.json(data, { status: init.status ?? 200, headers: { ...baseHeaders, ...init.headers } });
}

export function fail(code: ApiErrorCode, detail: Omit<ApiError["error"], "code"> = {}, headers: Record<string, string> = {}): Response {
  const extra: Record<string, string> = detail.retryAfter !== undefined ? { "retry-after": String(Math.max(0, Math.ceil(detail.retryAfter))) } : {};
  return json(apiError(code, detail), { status: API_ERROR_STATUS[code], headers: { ...extra, ...headers } });
}

export const invalidBody = (error: ZodError) => fail("invalid", { fields: fieldsFromIssues(error.issues.map((i) => ({ path: i.path.map(String), code: i.code }))) });

/** A setup-domain result code answered as the API contract. */
export function setupFailure(reason: SetupError | "avatar" | "limit" | "unavailable"): Response {
  switch (reason) {
    case "stale":
      return fail("stale", { reason });
    case "duplicate":
    case "done":
      return fail("conflict", { reason });
    case "limit":
      return fail("forbidden", { reason });
    case "unavailable":
      return fail("unavailable", { reason });
    case "generic":
      return fail("internal", { reason });
    default:
      return fail("invalid", { reason });
  }
}

/** Reads a JSON body; null when absent or malformed. */
export const readJson = (request: Request) => request.json().catch(() => null) as Promise<unknown>;

export const clientIpOf = (request: Request) => clientIpFrom(requestContext(request));

/** The signed-in user behind the bearer token, or null. Cookies are not consulted. */
export async function bearerUser(request: Request): Promise<{ token: string; user: SessionUser } | null> {
  const token = bearerTokenFrom(requestContext(request));
  const user = await sessionUserByToken(token);
  return token && user ? { token, user } : null;
}

/** The viewer for visibility checks (lib/data/publication.ts): the bearer user, or an anonymous reader. */
export async function viewerOf(request: Request): Promise<Viewer> {
  const bearer = await bearerUser(request);
  return { userId: bearer?.user.id ?? null, staff: adminAccess(bearer?.user ?? null, adminMfaRequired(), "agencies.view") === "ok" };
}

type AgencyRow = NonNullable<Awaited<ReturnType<typeof getAgencyByOwner>>>;

/** The bearer user who owns an agency, or the error response to send. */
export async function requireApiAgency(request: Request): Promise<{ token: string; user: SessionUser; agency: AgencyRow } | Response> {
  const bearer = await bearerUser(request);
  const decision = authorizeAgency(bearer?.user ?? null, bearer ? await getAgencyByOwner(bearer.user.id) : null);
  if (!decision.ok) return fail(decision.deny === "unauthenticated" ? "unauthenticated" : "forbidden", { reason: decision.deny });
  return { token: bearer!.token, user: decision.user, agency: decision.agency };
}

/**
 * Wraps a route: 404 like an unknown path while the API is switched off, the error contract for anything
 * thrown, and the shared headers on every answer.
 */
export function route<A extends unknown[]>(handler: (request: Request, ...args: A) => Promise<Response>) {
  return async (request: Request, ...args: A): Promise<Response> => {
    if (!apiV1Enabled()) return new Response("Not found", { status: 404, headers: baseHeaders });
    // A native client names its version; one older than the configured minimum is told to update (426) before anything else runs.
    const minimum = apiMinAppVersion();
    if (minimum && upgradeRequired(request.headers.get("x-sawwiq-app"), minimum)) return fail("upgrade_required", { reason: "minVersion" }, { "x-min-app-version": minimum });
    try {
      return await handler(request, ...args);
    } catch (error) {
      console.error("[api/v1]", request.method, new URL(request.url).pathname, error);
      return fail("internal");
    }
  };
}

/** Media of a draft is served to bearer clients by /api/v1/media/:id (the web uses /api/setup-media/:id). */
export const apiSetupView = (view: SetupView | null) => (view ? { ...view, media: view.media.map((m) => ({ ...m, url: `/api/v1/media/${m.id}` })) } : null);
