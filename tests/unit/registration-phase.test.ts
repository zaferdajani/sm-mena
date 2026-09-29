import "./setup-db";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createUser } from "@/lib/data/users";
import { createAgency, getAgencyByHandle, listAgencies } from "@/lib/data/agencies";
import { createPost, getFeed, getPost, getPostsByIds } from "@/lib/data/posts";
import { publicationFor, setPublication, mayReadAgency, mayIndexAgency } from "@/lib/data/publication";
import { canReadProfile, launchPhase, launchAllowsFeature, profileIndexable } from "@/lib/launch-phase";
import { featureOpen, resetFeatureCache } from "@/lib/features";
import { createContract, getContractByToken, clientSign, type ContractInput } from "@/lib/data/contracts";
import { createNda, type NdaInput } from "@/lib/data/ndas";
import { startPlanCheckout } from "@/lib/data/payments";
import { closeDb, getDb } from "@/lib/db";
import { agencies, profilePublications } from "@/lib/db/schema";
import { isPrivateKey, storage } from "@/lib/storage";
import { SIGNATURE_PNG } from "./png";
import sharp from "sharp";

const actor = vi.hoisted(() => ({ userId: null as string | null, agencyId: null as string | null, staff: false, pilot: false }));
vi.mock("@/lib/launch-access", () => ({
  launchViewer: async () => actor,
  canBrowseDirectory: async () => process.env.LAUNCH_PHASE !== "registration" || actor.staff || actor.pilot,
}));
afterEach(() => { vi.unstubAllEnvs(); actor.userId = null; actor.agencyId = null; actor.staff = false; actor.pilot = false; resetFeatureCache(); });
afterAll(closeDb);
const account = async (prefix: string) => {
  const name = `${prefix}.${crypto.randomUUID().slice(0, 8)}`;
  const user = await createUser(`${name}@test.invalid`, "password-12345");
  const agency = await createAgency(user.id, { handle: name, name, city: "riyadh", bio: "Real test portfolio", services: ["photography"] });
  return { user, agency };
};

describe("reversible launch phase", () => {
  it("fails closed on missing or invalid configuration and cannot be bypassed with a handle in a URL", () => {
    vi.stubEnv("LAUNCH_PHASE", undefined); expect(launchPhase()).toBe("registration");
    vi.stubEnv("LAUNCH_PHASE", "typo"); expect(launchPhase()).toBe("registration");
    vi.stubEnv("LAUNCH_PILOT_HANDLES", "trusted.agency");
    expect(launchAllowsFeature("collaboration", { agencyHandle: "attacker" })).toBe(false);
    expect(launchAllowsFeature("collaboration", { agencyHandle: "trusted.agency" })).toBe(true);
    expect(launchAllowsFeature("contracts", { staff: true, agencyHandle: "trusted.agency" })).toBe(false);
  });
  it("discovery does not automatically open financial features; full still honors independent feature flags", async () => {
    vi.stubEnv("LAUNCH_PHASE", "discovery");
    expect(launchAllowsFeature("ai_matchmaker")).toBe(true);
    for (const key of ["contracts", "ndas", "protected_payments", "paid_plans"]) expect(launchAllowsFeature(key)).toBe(false);
    vi.stubEnv("LAUNCH_PHASE", "full");
    expect(launchAllowsFeature("contracts")).toBe(true);
    expect(await featureOpen("protected_payments")).toBe(false);
  });
  it("keeps publication separate from launch phase", () => {
    for (const phase of ["registration", "discovery", "full"]) {
      vi.stubEnv("LAUNCH_PHASE", phase);
      expect(canReadProfile("private", false, false)).toBe(false);
      expect(canReadProfile("private", true, false)).toBe(true);
      expect(canReadProfile("unlisted", false, false)).toBe(true);
      expect(profileIndexable("private")).toBe(false);
      expect(profileIndexable("unlisted")).toBe(false);
      expect(profileIndexable("public")).toBe(phase !== "registration");
      expect(profileIndexable("public", true)).toBe(false);
    }
  });
});

describe("private profiles, not just hidden navigation", () => {
  it("creates the private preference in the account transaction and prevents anonymous metadata/feed/post/media reads", async () => {
    vi.stubEnv("LAUNCH_PHASE", "registration");
    const { agency, user } = await account("private");
    expect(await publicationFor(agency.id)).toEqual({ visibility: "private", legacy: false });
    expect(await mayReadAgency(agency)).toBe(false);
    expect(await listAgencies({})).toEqual([]);
    const png = await sharp({ create: { width: 400, height: 400, channels: 3, background: "#106b4c" } }).png().toBuffer();
    const post = await createPost(agency.id, { caption: "Private work not for public browsing", services: ["photography"], platforms: [] }, [png]);
    expect(await getPost(post.id)).toBeNull();
    expect(await getPostsByIds([post.id])).toEqual([]);
    expect((await getFeed({ agencyId: agency.id }, null)).items).toEqual([]);
    actor.userId = user.id; actor.agencyId = agency.id;
    const own = await getPost(post.id);
    expect(own?.images[0].url).toMatch(/^\/api\/portfolio-media\/portfolio\//);
    expect(own?.images[0].thumbUrl).toMatch(/-t\.webp$/);
    expect(await mayReadAgency(agency)).toBe(true);
    expect(isPrivateKey(`portfolio/${agency.id}/posts/a.webp`)).toBe(true);
    expect(() => storage().url("collab/private/test.webp")).toThrow();
  });
  it("rejects another owner's changes; publication survives phase changes and unlisted is never discovered", async () => {
    vi.stubEnv("LAUNCH_PHASE", "registration");
    const { agency, user } = await account("visibility");
    const other = await account("other");
    expect(await setPublication(other.user.id, agency.id, "public")).toBe(false);
    expect((await publicationFor(agency.id)).visibility).toBe("private");
    expect(await setPublication(user.id, agency.id, "unlisted")).toBe(true);
    expect(await mayReadAgency(agency)).toBe(true);
    vi.stubEnv("LAUNCH_PHASE", "discovery");
    expect((await publicationFor(agency.id)).visibility).toBe("unlisted");
    expect((await listAgencies({ q: agency.handle })).length).toBe(0);
    expect(await mayIndexAgency(agency)).toBe(false);
    expect(await setPublication(user.id, agency.id, "public")).toBe(true);
    expect((await listAgencies({ q: agency.handle })).map((a) => a.id)).toEqual([agency.id]);
    vi.stubEnv("LAUNCH_PHASE", "full");
    expect((await getAgencyByHandle(agency.handle))?.id).toBe(agency.id);
    expect((await publicationFor(agency.id)).visibility).toBe("public");
    vi.stubEnv("LAUNCH_PHASE", "registration");
    expect(await listAgencies({})).toEqual([]);
    expect(await mayIndexAgency(agency)).toBe(false);
    expect((await publicationFor(agency.id)).visibility).toBe("public");
  });
  it("keeps already published legacy links, without including them in the registration directory", async () => {
    vi.stubEnv("LAUNCH_PHASE", "full");
    const { agency } = await account("legacy");
    vi.stubEnv("LAUNCH_PHASE", "registration");
    expect(await publicationFor(agency.id)).toEqual({ visibility: "public", legacy: true });
    expect(await mayReadAgency(agency)).toBe(true);
    expect(await listAgencies({ q: agency.handle })).toEqual([]);
    const db = await getDb();
    expect(await db.select().from(profilePublications).where(eq(profilePublications.agencyId, agency.id))).toEqual([]);
    expect((await db.select().from(agencies).where(eq(agencies.id, agency.id)))[0].handle).toBe(agency.handle);
  });
});

describe("transaction release boundary", () => {
  it("blocks new documents/checkouts even with enabled flags; existing signed contract remains available", async () => {
    vi.stubEnv("LAUNCH_PHASE", "full");
    const { agency } = await account("archive");
    const draft: ContractInput = {
      title: "Existing client project", summary: "Agreed work before phase transition", items: [], startDate: "2026-10-01", endDate: "2026-11-30", paymentMode: "direct", nda: false,
      client: { name: "Test Client", phone: "+962790000001" }, milestones: [{ title: "First delivery", dueDate: "2026-10-31", amountFils: 100000, checks: ["Deliver agreed files"] }], signerName: "Test Provider", signature: SIGNATURE_PNG, locale: "en",
    };
    const created = await createContract(agency.id, draft);
    if (!("token" in created)) throw new Error(created.error);
    await clientSign(created.token, "Test Client", "127.0.0.1", SIGNATURE_PNG);
    const original = (await getContractByToken(created.token))!;
    vi.stubEnv("LAUNCH_PHASE", "registration");
    expect(await createContract(agency.id, draft)).toEqual({ error: "unavailable" });
    expect(await createNda(agency.id, {} as NdaInput)).toEqual({ error: "unavailable" });
    await expect(startPlanCheckout(agency.id, "pro", 1, agency.ownerUserId)).rejects.toThrow("unavailable");
    const retained = (await getContractByToken(created.token))!;
    expect(retained.contract.id).toBe(original.contract.id);
    expect(retained.contract.status).toBe(original.contract.status);
    expect(retained.contract.termsHash).toBe(original.contract.termsHash);
  });
});
