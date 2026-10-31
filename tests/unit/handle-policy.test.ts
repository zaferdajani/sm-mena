import "./setup-db";
import { afterAll, describe, expect, it } from "vitest";
import { consumesChange, handlePolicy } from "@/lib/core/rules/handle-policy";
import { agencyByPreviousHandle, createAgency, isHandleTaken, recordHandleChange } from "@/lib/data/agencies";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";

afterAll(() => closeDb());

describe("handle policy (docs/65 stage 8)", () => {
  it("is free before the first publish, once after it, then locked", () => {
    expect(handlePolicy({ postCount: 0, handleChangedAt: null })).toEqual({ canChange: true, reason: "free" });
    expect(handlePolicy({ postCount: 0, handleChangedAt: new Date() })).toEqual({ canChange: true, reason: "free" });
    expect(handlePolicy({ postCount: 2, handleChangedAt: null })).toEqual({ canChange: true, reason: "once_left" });
    expect(handlePolicy({ postCount: 2, handleChangedAt: new Date() })).toEqual({ canChange: false, reason: "locked" });
    expect(consumesChange({ postCount: 0, handleChangedAt: null })).toBe(false);
    expect(consumesChange({ postCount: 1, handleChangedAt: null })).toBe(true);
  });

  it("an old link stays the page's own: it redirects, and nobody else can take it", async () => {
    const stamp = Date.now().toString(36);
    const user = await createUser(`handle-${stamp}@test.jo`, "x".repeat(24), "agency");
    const agency = await createAgency(user.id, { name: "Old Name", handle: `old${stamp}`, city: "amman", services: ["seo"] } as never);
    await recordHandleChange(agency.id, `old${stamp}`);
    expect(await agencyByPreviousHandle(`OLD${stamp}`)).toEqual({ handle: `old${stamp}` });
    expect(await isHandleTaken(`old${stamp}`)).toBe(true);
    expect(await isHandleTaken(`old${stamp}`, agency.id)).toBe(false);
    expect(await agencyByPreviousHandle(`never${stamp}`)).toBeNull();
  });
});
