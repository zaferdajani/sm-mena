import { ApiFailure } from "./api/client";
import type { Strings } from "./i18n";

/** The sentence a failure deserves, from its code and reason; values never come from the server. */
export function messageFor(error: unknown, t: (key: keyof Strings, vars?: Record<string, string | number>) => string): string {
  if (error instanceof ApiFailure) {
    switch (error.code) {
      case "unauthenticated":
        return t("errInvalidCredentials");
      case "mfa_required":
        return t("errMfa");
      case "forbidden":
        return error.reason === "staff" ? t("errStaff") : t("errGeneric");
      case "rate_limited":
        return t("errRateLimited", { minutes: Math.max(1, Math.ceil((error.retryAfter ?? 900) / 60)) });
      case "stale":
        return t("errStale");
      case "invalid":
      case "conflict":
        return t("errInvalid");
      case "unavailable":
        return t("errUnavailable");
      case "not_found":
        return t("errNotFound");
      default:
        return t("errGeneric");
    }
  }
  if (error instanceof TypeError) return t("errNetwork");
  return t("errGeneric");
}
