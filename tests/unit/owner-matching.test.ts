import "./setup-db";
import { afterAll, describe, expect, it } from "vitest";
import { matchOwner, providerGroups, scoreProvider, type ProviderFacts } from "@/lib/core/rules/matching/owners";
import { createAgency } from "@/lib/data/agencies";
import { listNotifications } from "@/lib/data/notifications";
import { computeOwnerMatches, listOwnerMatches, respondToOwnerMatch, sendOwnerMatchEmails, visibleToOwner } from "@/lib/data/owner-matching";
import { saveOwnerNeed } from "@/lib/data/owner-needs";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";

// Owner ↔ provider matching (docs/59): the pure ranking, then the store: compute → send (gated) → accept.

afterAll(async () => closeDb());

const base: ProviderFacts = { id: "p", country: "jo", city: "amman", servesCountries: [], services: ["smm_management"], industries: [], isDemo: false, active: true, postCount: 1, hasBio: true };
const need = { country: "jo", city: "amman", businessType: "restaurant_cafe", services: ["social_media"] };

describe("matchOwner", () => {
  it("maps service keys to their catalog group", () => {
    expect([...providerGroups(["smm_management", "social_media", "nonsense"])]).toEqual(["social_media"]);
  });
  it("requires the owner's country (or that the provider serves it), excludes demo and inactive providers, and skips providers covering none of the needs", () => {
    expect(scoreProvider(need, { ...base, country: "sa" })).toBeNull();
    expect(scoreProvider(need, { ...base, country: "sa", servesCountries: ["jo"] })?.reasons).toContain("serves_country");
    expect(scoreProvider(need, { ...base, isDemo: true })).toBeNull();
    expect(scoreProvider(need, { ...base, active: false })).toBeNull();
    expect(scoreProvider(need, { ...base, services: ["logo_design"] })).toBeNull();
  });
  it("ranks same city, full service coverage, matching industry and published work above the rest, deterministically", () => {
    const strong = { ...base, id: "a", industries: ["restaurant_cafe"] };
    const otherCity = { ...base, id: "b", city: "irbid" };
    const noWork = { ...base, id: "c", postCount: 0, hasBio: false };
    const partial = { ...base, id: "d", services: ["smm_management"] };
    const ranked = matchOwner({ ...need, services: ["social_media", "paid_media"] }, [noWork, partial, otherCity, strong]);
    expect(ranked.map((m) => m.agencyId)[0]).toBe("a");
    expect(ranked.find((m) => m.agencyId === "a")?.reasons).toEqual(expect.arrayContaining(["same_city", "services_some", "industry", "has_work"]));
    expect(ranked.map((m) => m.agencyId)).toEqual(matchOwner({ ...need, services: ["social_media", "paid_media"] }, [strong, otherCity, partial, noWork]).map((m) => m.agencyId));
    expect(matchOwner(need, Array.from({ length: 9 }, (_, i) => ({ ...base, id: `x${i}` })))).toHaveLength(5);
  });
});

describe("owner matching store", () => {
  it("computes suggestions, hides them from the owner until sent, gates sending, and accepting introduces the provider", async () => {
    const stamp = Date.now();
    const ownerUser = await createUser(`owner-match-${stamp}@test.jo`, "x".repeat(24), "client");
    await saveOwnerNeed(ownerUser.id, { country: "jo", city: "amman", businessType: "restaurant_cafe", services: ["social_media"], timing: "now", whatsapp: "+962790000001", note: "test need" }, "en");
    const providerUser = await createUser(`provider-match-${stamp}@test.jo`, "x".repeat(24), "agency");
    const agency = await createAgency(providerUser.id, { name: `Match Agency ${stamp}`, handle: `match${stamp}`, city: "amman", bio: "social media for cafés", services: ["smm_management"], platforms: ["instagram"], industries: ["restaurant_cafe"], languages: ["ar"], whatsapp: "0790000000" } as never, { postCount: 1 } as never);
    const demoUser = await createUser(`demo-match-${stamp}@test.jo`, "x".repeat(24), "agency");
    await createAgency(demoUser.id, { name: `Demo ${stamp}`, handle: `demo${stamp}`, city: "amman", bio: "demo", services: ["smm_management"], platforms: [], industries: [], languages: ["ar"] } as never, { isDemo: true } as never);

    const dry = await computeOwnerMatches({ dryRun: true });
    const mine = dry.perOwner.find((p) => p.ownerUserId === ownerUser.id)!;
    expect(mine.matches.map((m) => m.agencyId)).toContain(agency.id);
    expect((await listOwnerMatches(ownerUser.id)).length).toBe(0); // a dry run stores nothing

    const computed = await computeOwnerMatches();
    expect(computed.suggestions).toBeGreaterThanOrEqual(1);
    const suggested = await listOwnerMatches(ownerUser.id);
    expect(suggested.some((m) => m.agency.id === agency.id && m.status === "suggested")).toBe(true);
    expect(suggested.some((m) => m.agency.name.startsWith("Demo"))).toBe(false);
    expect(suggested.filter(visibleToOwner)).toHaveLength(0);
    // answering before the send is refused
    const match = suggested.find((m) => m.agency.id === agency.id)!;
    expect(await respondToOwnerMatch(ownerUser.id, match.id, "accept", "http://localhost", "en")).toBe("notSent");

    // sending is gated by the phase switch; forced here
    const closed = await sendOwnerMatchEmails("http://localhost", { force: false });
    const sentSummary = closed.skipped === "closed" ? await sendOwnerMatchEmails("http://localhost", { force: true }) : closed;
    expect(sentSummary.sent).toBeGreaterThanOrEqual(1);
    const sent = await listOwnerMatches(ownerUser.id);
    expect(sent.find((m) => m.agency.id === agency.id)?.status).toBe("sent");
    expect(sent.filter(visibleToOwner).length).toBeGreaterThanOrEqual(1);

    // a recompute keeps sent rows
    await computeOwnerMatches();
    expect((await listOwnerMatches(ownerUser.id)).find((m) => m.agency.id === agency.id)?.status).toBe("sent");

    // the owner's acceptance introduces the two sides: the provider gets a notification
    expect(await respondToOwnerMatch(ownerUser.id, match.id, "accept", "http://localhost", "en")).toBe("accepted");
    expect((await listOwnerMatches(ownerUser.id)).find((m) => m.agency.id === agency.id)?.status).toBe("introduced");
    const notes = await listNotifications({ agencyId: agency.id });
    expect(notes.some((n) => n.kind === "owner_intro" && String(n.params.city) === "amman")).toBe(true);
    // another owner's id cannot answer this match
    expect(await respondToOwnerMatch(providerUser.id, match.id, "decline", "http://localhost", "en")).toBe("notFound");
  });
});
