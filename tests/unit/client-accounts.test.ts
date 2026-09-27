import "./setup-db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { checkCode, issueCode, MAX_TRIES } from "@/lib/auth/email-code";
import { createAgency } from "@/lib/data/agencies";
import { accountKey, isFollowing, listFollowers, mergeDeviceInteractions, toggleFollow } from "@/lib/data/interactions";
import { maskEmail } from "@/lib/format";
import { createUser } from "@/lib/data/users";
import { getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";

describe("client sign-in codes", () => {
  it("accepts the right code once, and not after it expires", async () => {
    const code = await issueCode("owner@codes.jo");
    expect(await checkCode("owner@codes.jo", "000000" === code ? "111111" : "000000")).toBe("badCode");
    expect(await checkCode("owner@codes.jo", code)).toBe("ok");
    expect(await checkCode("owner@codes.jo", code)).toBe("expired");
    const late = await issueCode("late@codes.jo", new Date(Date.now() - 11 * 60 * 1000));
    expect(await checkCode("late@codes.jo", late)).toBe("expired");
  });

  it("locks a code after too many wrong tries", async () => {
    const code = await issueCode("guess@codes.jo");
    const wrong = code === "123456" ? "654321" : "123456";
    for (let i = 0; i < MAX_TRIES - 1; i++) expect(await checkCode("guess@codes.jo", wrong)).toBe("badCode");
    expect(await checkCode("guess@codes.jo", wrong)).toBe("tooMany");
    expect(await checkCode("guess@codes.jo", code)).toBe("tooMany");
  });
});

describe("moving a device's follows to the account", () => {
  it("moves them once, drops duplicates and recounts from accounts only", async () => {
    const owner = await createUser("agency@merge.jo", "password-1234");
    const agency = await createAgency(owner.id, { handle: "merge.agency", name: "Merge", city: "amman", services: ["smm_management"] });
    const client = await createUser("client@merge.jo", "x".repeat(20), "client");
    const device = "0f0f0f0f-0000-4000-8000-000000000001";
    // Followed anonymously on the phone (before sign-in existed), and already on the account.
    await toggleFollow(agency.id, device);
    await toggleFollow(agency.id, accountKey(client.id));
    await mergeDeviceInteractions(device, client.id);
    expect(await isFollowing(device, agency.id)).toBe(false);
    expect(await isFollowing(accountKey(client.id), agency.id)).toBe(true);
    const [row] = await (await getDb()).select({ n: agencies.followerCount }).from(agencies).where(eq(agencies.id, agency.id));
    expect(row.n).toBe(1);
  });

  it("lists an agency's followers as signed-in accounts only, newest first, and masks their addresses", async () => {
    const owner = await createUser("agency@list.jo", "password-1234");
    const agency = await createAgency(owner.id, { handle: "list.agency", name: "List", city: "amman", services: ["smm_management"] });
    const first = await createUser("first@list.jo", "x".repeat(20), "client");
    const second = await createUser("second@list.jo", "x".repeat(20), "client");
    await toggleFollow(agency.id, accountKey(first.id));
    await toggleFollow(agency.id, "0f0f0f0f-0000-4000-8000-000000000002"); // an anonymous device never shows
    await toggleFollow(agency.id, accountKey(second.id));
    const followers = await listFollowers(agency.id);
    expect(followers.map((f) => f.email)).toEqual(["second@list.jo", "first@list.jo"]);
    expect(followers.map((f) => maskEmail(f.email))).toEqual(["se…@list.jo", "fi…@list.jo"]);
    expect(maskEmail("a@b.co")).toBe("a…@b.co");
    await toggleFollow(agency.id, accountKey(second.id)); // unfollow
    expect((await listFollowers(agency.id)).map((f) => f.email)).toEqual(["first@list.jo"]);
  });
});
