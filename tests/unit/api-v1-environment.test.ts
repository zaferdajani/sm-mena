import { describe, expect, it } from "vitest";
import { apiV1Allowed } from "@/lib/core/rules/api-v1-environment";

describe("M3 staging-only API gate", () => {
  const staging = { API_V1_ENABLED: "true", API_V1_ENVIRONMENT: "staging", NODE_ENV: "production" };
  it("requires an exact opt-in and a known non-production scope", () => {
    for (const API_V1_ENABLED of [undefined, "false", "TRUE", "1"]) {
      expect(apiV1Allowed({ ...staging, API_V1_ENABLED })).toBe(false);
    }
    expect(apiV1Allowed({ API_V1_ENABLED: "true" })).toBe(false);
    expect(apiV1Allowed({ API_V1_ENABLED: "true", NODE_ENV: "production" })).toBe(false);
    expect(apiV1Allowed({ API_V1_ENABLED: "true", VERCEL_ENV: "preview" })).toBe(false);
  });
  it("allows explicitly isolated staging builds and local development/tests", () => {
    expect(apiV1Allowed(staging)).toBe(true);
    expect(apiV1Allowed({ ...staging, VERCEL_ENV: "preview", VERCEL: "1" })).toBe(true);
    for (const NODE_ENV of ["test", "development"]) {
      expect(apiV1Allowed({ API_V1_ENABLED: "true", NODE_ENV })).toBe(true);
    }
  });
  it("production hosting markers veto even copied staging settings", () => {
    for (const key of ["VERCEL_ENV", "VERCEL_TARGET_ENV", "API_V1_ENVIRONMENT"]) {
      expect(apiV1Allowed({ ...staging, [key]: "production" })).toBe(false);
    }
    expect(apiV1Allowed({ API_V1_ENABLED: "true", NODE_ENV: "development", VERCEL: "1" })).toBe(false);
  });
});
