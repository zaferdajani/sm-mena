import { describe, expect, it } from "vitest";
import { availabilityFor, coverage, isFresh, type Window } from "@/lib/collab/availability";
import { eligible, page, rank, type Candidate, type Query } from "@/lib/collab/discovery";
import { dateIn, endOfDayIn, offsetMinutes, rangeIn, startOfDayIn } from "@/lib/collab/time";
import { availabilitySchema, inquirySchema, needSchema, quoteSchema } from "@/lib/collab/schemas";

// Pure collaboration rules (docs/48-collaboration-v2.md): dates in zones,
// availability freshness, discovery eligibility and ranking, input schemas.

const d = (s: string) => new Date(s);

describe("calendar dates in a time zone", () => {
  it("turns an Amman day into the right UTC instants (Jordan is UTC+3 all year)", () => {
    expect(offsetMinutes("Asia/Amman", d("2026-10-05T12:00:00Z"))).toBe(180);
    expect(startOfDayIn("2026-10-05", "Asia/Amman").toISOString()).toBe("2026-10-04T21:00:00.000Z");
    expect(endOfDayIn("2026-10-05", "Asia/Amman").toISOString()).toBe("2026-10-05T21:00:00.000Z");
    expect(dateIn(d("2026-10-04T21:30:00Z"), "Asia/Amman")).toBe("2026-10-05");
  });
  it("keeps the same calendar day distinct in Riyadh and Cairo", () => {
    const amman = rangeIn("2026-11-01", "2026-11-01", "Asia/Amman");
    const cairo = rangeIn("2026-11-01", "2026-11-01", "Africa/Cairo");
    expect(amman.start.getTime()).toBeLessThan(cairo.start.getTime());
    expect(cairo.start.getTime() - amman.start.getTime()).toBe(3600_000);
  });
  it("survives a day the offset changes (Europe/London, 25 Oct 2026)", () => {
    const start = startOfDayIn("2026-10-25", "Europe/London");
    const end = endOfDayIn("2026-10-25", "Europe/London");
    expect(start.toISOString()).toBe("2026-10-24T23:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect((end.getTime() - start.getTime()) / 3600_000).toBe(25);
  });
});

const now = d("2026-10-01T09:00:00Z");
const w = (over: Partial<Window>): Window => ({ startsAt: d("2026-10-05T00:00:00Z"), endsAt: d("2026-10-10T00:00:00Z"), status: "available", confirmedAt: d("2026-09-28T00:00:00Z"), expiresAt: d("2026-10-12T00:00:00Z"), ...over });
const period = { start: d("2026-10-06T00:00:00Z"), end: d("2026-10-08T00:00:00Z") };

describe("availability", () => {
  it("is unknown without a window, stale when the confirmation is old or expired, confirmed when fresh", () => {
    expect(availabilityFor([], period, now)).toBe("unknown");
    expect(availabilityFor([w({})], period, now)).toBe("confirmed");
    expect(availabilityFor([w({ confirmedAt: d("2026-09-01T00:00:00Z") })], period, now)).toBe("stale");
    expect(availabilityFor([w({ expiresAt: d("2026-09-30T00:00:00Z") })], period, now)).toBe("stale");
    expect(isFresh(w({}), now)).toBe(true);
  });
  it("lets busy win, marks limited, and treats a gap in coverage as unknown", () => {
    expect(availabilityFor([w({}), w({ status: "busy", startsAt: d("2026-10-07T00:00:00Z") })], period, now)).toBe("busy");
    expect(availabilityFor([w({ status: "limited" })], period, now)).toBe("limited");
    expect(availabilityFor([w({ endsAt: d("2026-10-07T00:00:00Z") })], period, now)).toBe("unknown");
    expect(coverage([{ start: d("2026-10-06T00:00:00Z"), end: d("2026-10-07T00:00:00Z") }, { start: d("2026-10-07T00:00:00Z"), end: d("2026-10-09T00:00:00Z") }], period)).toBe(true);
  });
  it("handles a window that ends exactly at midnight before the period", () => {
    expect(availabilityFor([w({ endsAt: period.start })], period, now)).toBe("unknown");
    expect(availabilityFor([w({ startsAt: period.end })], period, now)).toBe("unknown");
  });
});

const base: Candidate = { id: "b", kind: "freelancer", country: "jo", servesCountries: [], city: "amman", languages: ["ar"], roles: ["photographer"], services: ["photography"], postsByService: { photography: 3 }, postCount: 3, isVerified: false, isDemo: false, status: "active", openToWork: null, workModes: [], availability: "unknown", partner: false, saved: false };
const q: Query = { askerId: "me", askerCountry: "jo", askerCity: "amman", roles: ["photographer"], blocked: new Set(), includeDemo: false };

describe("discovery", () => {
  it("filters hard before ranking: self, suspended, blocked, demo, other country, wrong role, opted out, busy", () => {
    expect(eligible(base, q)).toBe(true);
    expect(eligible({ ...base, id: "me" }, q)).toBe(false);
    expect(eligible({ ...base, status: "suspended" }, q)).toBe(false);
    expect(eligible(base, { ...q, blocked: new Set(["b"]) })).toBe(false);
    expect(eligible({ ...base, isDemo: true }, q)).toBe(false);
    expect(eligible({ ...base, country: "sa" }, q)).toBe(false);
    expect(eligible({ ...base, country: "sa", servesCountries: ["jo"] }, q)).toBe(true);
    expect(eligible({ ...base, roles: ["videographer"] }, q)).toBe(false);
    expect(eligible({ ...base, openToWork: false }, q)).toBe(false);
    expect(eligible({ ...base, availability: "busy" }, q)).toBe(false);
    expect(eligible({ ...base, availability: "stale" }, { ...q, confirmedOnly: true })).toBe(false);
    expect(eligible({ ...base, workModes: ["remote"] }, { ...q, workMode: "on_site" })).toBe(false);
  });
  it("puts confirmed availability first, explains each score, and orders ties by id", () => {
    const rows = rank([{ ...base, id: "z" }, { ...base, id: "a" }, { ...base, id: "m", availability: "confirmed" }, { ...base, id: "k", availability: "stale", partner: true }], q);
    expect(rows.map((r) => r.candidate.id)).toEqual(["m", "k", "a", "z"]);
    expect(rows[0].group).toBe("ready");
    expect(rows[0].reasons).toEqual(expect.arrayContaining(["role", "service_evidence", "same_city", "available"]));
    expect(rows[1].group).toBe("needs_confirmation");
    expect(rows[1].reasons).toContain("partner");
    expect(rows[2].score).toBe(rows[3].score);
  });
  it("never lets an unknown candidate be labelled ready", () => {
    for (const r of rank([{ ...base, availability: "unknown" }, { ...base, id: "c", availability: "stale" }], q)) expect(r.group).toBe("needs_confirmation");
  });
  it("pages deterministically", () => {
    const rows = Array.from({ length: 45 }, (_, i) => ({ ...base, id: String(i).padStart(3, "0") }));
    const ranked = rank(rows, q);
    const p1 = page(ranked, 0);
    const p2 = page(ranked, p1.next!);
    const p3 = page(ranked, p2.next!);
    expect([p1.items.length, p2.items.length, p3.items.length, p3.next, p1.total]).toEqual([20, 20, 5, null, 45]);
    expect(new Set([...p1.items, ...p2.items, ...p3.items].map((r) => r.candidate.id)).size).toBe(45);
  });
});

describe("input schemas", () => {
  it("refuse reversed dates, unknown zones and money that is not a number", () => {
    expect(availabilitySchema.safeParse({ from: "2026-10-10", to: "2026-10-01", timezone: "Asia/Amman", status: "available", capacityUnits: "", capacityUnit: "", visibility: "partners", note: "" }).success).toBe(false);
    expect(availabilitySchema.safeParse({ from: "2026-10-01", to: "2026-10-10", timezone: "Mars/Olympus", status: "available", capacityUnits: "", capacityUnit: "", visibility: "partners", note: "" }).success).toBe(false);
    const need = needSchema.safeParse({ title: "Reels editor", roles: ["video_editor"], services: [], scope: "", workMode: "remote", city: "", country: "jo", languages: ["ar"], startsOn: "", endsOn: "", budgetMin: "300", budgetMax: "100", modes: ["private"], audience: "public", days: 30 });
    expect(need.success).toBe(false);
    const ok = needSchema.safeParse({ title: "Reels editor", roles: ["video_editor"], services: [], scope: "", workMode: "remote", city: "", country: "jo", languages: ["ar"], startsOn: "", endsOn: "", budgetMin: "100", budgetMax: "300.5", modes: ["private"], audience: "public", days: 30 });
    expect(ok.success && ok.data.budgetMax).toBe(300_500);
    expect(quoteSchema.safeParse({ amount: "abc", currency: "JOD", startsOn: "", dueOn: "", scopeNote: "", exclusions: "" }).success).toBe(false);
    expect(inquirySchema.safeParse({ title: "x", role: "", deliverables: [], scope: "", assetsNote: "", startsOn: "", dueOn: "", timezone: "Asia/Amman", workMode: "remote", city: "", budget: "", privacyMode: "private", responseDays: 7, recipients: [], needId: "", parentContractId: "" }).success).toBe(false);
  });
});
