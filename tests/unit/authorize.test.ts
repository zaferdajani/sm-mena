import { describe, expect, it } from "vitest";
import { authorizeAgency, authorizeStaff } from "@/lib/core/rules/auth/authorize";

// Authorization as decisions (roadmap §3 step 7): the table the web guards redirect on and the API answers with.
const u = (role: string, mfaEnabled = false) => ({ id: "u1", role, mfaEnabled });
const agency = { id: "a1" };

describe("authorizeAgency", () => {
  it("denies anonymous readers with the login page", () => {
    expect(authorizeAgency(null, null)).toEqual({ ok: false, deny: "unauthenticated", redirectTo: "/login" });
  });
  it("sends each non-owner role to its own home", () => {
    expect(authorizeAgency(u("admin"), null)).toMatchObject({ deny: "wrong_role", redirectTo: "/admin" });
    expect(authorizeAgency(u("support"), null)).toMatchObject({ deny: "wrong_role", redirectTo: "/admin" });
    expect(authorizeAgency(u("client"), null)).toMatchObject({ deny: "wrong_role", redirectTo: "/saved" });
    expect(authorizeAgency(u("agent"), null)).toMatchObject({ deny: "wrong_role", redirectTo: "/agent" });
    expect(authorizeAgency(u("agency"), null)).toMatchObject({ deny: "wrong_role", redirectTo: "/login" });
  });
  it("admits the owner with both records", () => {
    expect(authorizeAgency(u("agency"), agency)).toEqual({ ok: true, user: u("agency"), agency });
  });
});

describe("authorizeStaff", () => {
  it("anonymous → login; non-staff → home; staff without the permission → dashboard", () => {
    expect(authorizeStaff(null, false)).toMatchObject({ deny: "unauthenticated", redirectTo: "/login" });
    expect(authorizeStaff(u("agency"), false)).toMatchObject({ deny: "forbidden", redirectTo: "/" });
    expect(authorizeStaff(u("support"), false, "features.manage")).toMatchObject({ deny: "forbidden", redirectTo: "/admin" });
  });
  it("two-factor enrolment is the only page open to unenrolled staff when it is required", () => {
    expect(authorizeStaff(u("admin"), true)).toMatchObject({ deny: "mfa_enroll", redirectTo: "/admin/security" });
    expect(authorizeStaff(u("admin"), true, "dashboard.view", { allowEnroll: true })).toMatchObject({ ok: true });
    expect(authorizeStaff(u("admin", true), true)).toMatchObject({ ok: true });
    expect(authorizeStaff(u("owner"), false, "features.manage")).toMatchObject({ ok: true });
  });
});
