import { describe, expect, it } from "vitest";
import { API_ERROR_CODES, API_ERROR_STATUS, apiError, fieldsFromIssues, isApiError } from "@/lib/api/errors";

describe("API error contract", () => {
  it("maps every code to one HTTP status and recognises its own shape", () => {
    for (const code of API_ERROR_CODES) expect(API_ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
    expect(isApiError(apiError("stale"))).toBe(true);
    expect(isApiError({ error: { code: "nope" } })).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
  it("carries machine detail only: reason, field paths and a rounded retry-after", () => {
    const e = apiError("invalid", { reason: "noServices", fields: fieldsFromIssues([{ path: ["project", "title"], code: "too_small" }]), retryAfter: 1.2 });
    expect(e).toEqual({ error: { code: "invalid", reason: "noServices", fields: [{ path: "project.title", issue: "too_small" }], retryAfter: 2 } });
    expect(JSON.stringify(e)).not.toContain("message");
  });
});
