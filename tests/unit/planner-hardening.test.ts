import "./setup-db";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { plannerRequest, structureBrief, type PlannerBrief } from "@/lib/ai/planner";
import { REDACTED, redactBrief } from "@/lib/collab/redact";
import { TEMPLATES } from "@/lib/collab/templates";
import { createAgency } from "@/lib/data/agencies";
import { ASSISTANT_DAILY_BUDGET, assistantCallsUsed, reserveAssistantCall, usageDay } from "@/lib/data/collab-ai-usage";
import { createPlan, deletePlan, getPlan } from "@/lib/data/collab-plans";
import { saveRosterEntry } from "@/lib/data/collab-roster";
import { createUser } from "@/lib/data/users";
import { getDb } from "@/lib/db";
import { collabAiUsage, type Agency } from "@/lib/db/schema";

// Hardening of the R3 planner (docs/50 §planner, AC23): every private-marker
// form is redacted, private fields never reach the request by construction,
// and the daily assistant budget is a durable per-agency reservation that
// plan deletion cannot refund. In-memory PGlite: transactions serialise, so
// the concurrency case here proves the counter's arithmetic; the locking on
// real Postgres is rehearsed by tests/postgres/collab-ai-usage.pgtest.ts.

const SYN = { rate: "RATE-4321-SYN", client: "CLIENT-NAME-SYN", phone: "+962 79 555 0123", arabic: "هامش-سري-SYN", multi: "MULTI-LINE-SYN" };

describe("redaction covers every private-marker form", () => {
  it("removes (private: …) and **private:** … inline forms and keeps the public text around them", () => {
    const r = redactBrief(`Shoot the menu (private: our margin is ${SYN.rate}) and post twice a week. **private:** client is ${SYN.client}. Public again.`);
    expect(r).not.toContain(SYN.rate);
    expect(r).not.toContain(SYN.client);
    expect(r).toContain("Shoot the menu");
    expect(r).toContain(REDACTED);
    // A marker in the middle of a paragraph redacts to the end of that paragraph, never less.
    const r2 = redactBrief(`Reels for a café. private: ${SYN.rate} and more\n\nSecond paragraph stays.`);
    expect(r2).not.toContain(SYN.rate);
    expect(r2).toContain("Second paragraph stays.");
  });
  it("removes Arabic markers, with and without tashkeel, and Arabic-Indic digits", () => {
    for (const marker of ["خاص:", "خاصّ:", "سري:", "سرّي:", "داخلي:", "لا يُرسل:", "ملاحظة خاصة:", "للداخل:"]) {
      // A section: the marker starts a line and everything to the blank line goes.
      const r = redactBrief(`نحتاج جلسة تصوير للقائمة.\n${marker} ${SYN.arabic}\nسطر ثانٍ ${SYN.rate}\n\nثلاثة منشورات أسبوعياً.`);
      expect(r, marker).not.toContain(SYN.arabic);
      expect(r, marker).not.toContain(SYN.rate);
      expect(r, marker).toContain("جلسة تصوير");
      expect(r, marker).toContain("ثلاثة منشورات");
      // Inline: the marker inside a line removes the rest of that line only.
      const r2 = redactBrief(`جلسة تصوير للقائمة، ${marker} ${SYN.arabic}\nثلاثة منشورات أسبوعياً.`);
      expect(r2, marker).not.toContain(SYN.arabic);
      expect(r2, marker).toContain("جلسة تصوير");
      expect(r2, marker).toContain("ثلاثة منشورات");
    }
    expect(redactBrief("واتساب ٠٧٩٥٥٥٠١٢٣ للتنسيق")).not.toMatch(/٠٧٩|0795550123/);
  });
  it("removes multiline private sections up to a blank line, an end marker or the end of the text", () => {
    const a = redactBrief(`Public brief line.\nprivate:\nline one ${SYN.multi}\nline two ${SYN.rate}\n\nPublic again.`);
    expect(a).not.toContain(SYN.multi);
    expect(a).not.toContain(SYN.rate);
    expect(a).toContain("Public brief line.");
    expect(a).toContain("Public again.");
    const b = redactBrief(`Intro.\n- Internal: ${SYN.multi}\nstill private ${SYN.client}\npublic: shoot on Monday`);
    expect(b).not.toContain(SYN.multi);
    expect(b).not.toContain(SYN.client);
    expect(b).toContain("shoot on Monday");
    const c = redactBrief(`Intro.\nConfidential: ${SYN.multi}\nlast line, no terminator ${SYN.rate}`);
    expect(c).not.toContain(SYN.multi);
    expect(c).not.toContain(SYN.rate);
    expect(c).toContain("Intro.");
    const d = redactBrief(`Before [private] ${SYN.multi}\n${SYN.rate} [/private] after. <private>${SYN.client}</private> tail.`);
    expect(d).not.toMatch(new RegExp(`${SYN.multi}|${SYN.rate}|${SYN.client}`));
    expect(d).toContain("Before");
    expect(d).toContain("after.");
    expect(d).toContain("tail.");
  });
  it("removes a section whose marker ends its line, list or heading markers before it, CRLF input and Arabic clitic prefixes", () => {
    const a = redactBrief(`Notes. Private:\n- margin ${SYN.rate}\n- client ${SYN.client}\n\nPublic again.`);
    expect(a).not.toMatch(new RegExp(`${SYN.rate}|${SYN.client}`));
    expect(a).toContain("Notes.");
    expect(a).toContain("Public again.");
    for (const lead of ["1. ", "## ", "* ", "+ "]) {
      const r = redactBrief(`Intro.\n${lead}private: ${SYN.rate}\nline two ${SYN.client}\n\nPublic.`);
      expect(r, lead).not.toMatch(new RegExp(`${SYN.rate}|${SYN.client}`));
      expect(r, lead).toContain("Public.");
    }
    const crlf = redactBrief(`Intro.\r\nprivate: ${SYN.rate}\r\nline ${SYN.client}\r\n\r\nPublic.`);
    expect(crlf).not.toMatch(new RegExp(`${SYN.rate}|${SYN.client}`));
    expect(crlf).toContain("Public.");
    expect(crlf).not.toContain("\r");
    for (const m of ["وخاص:", "الخاص:", "والسري:", "للداخلي:", "Private note:", "private notes:"]) expect(redactBrief(`جلسة تصوير. ${m} ${SYN.rate}`), m).not.toContain(SYN.rate);
    expect(redactBrief(`Speak privately: ${SYN.client} is fine here`)).toContain(SYN.client); // not a marker
  });
  it("is not fooled by decorations, invisible characters or case", () => {
    for (const text of [`_Private_: ${SYN.rate}`, `• private : ${SYN.rate}`, `PRIVATE: ${SYN.rate}`, `pri​vate: ${SYN.rate}`, `«خاص»: ${SYN.rate}`, `(Do not send: ${SYN.rate})`, `Not for the supplier: ${SYN.rate}`]) {
      expect(redactBrief(`Menu shoot. ${text}`), text).not.toContain(SYN.rate);
    }
    expect(redactBrief("Deliver between 2026-11-01 and 2026-12-31, 12 photos.")).toContain("2026-11-01 and 2026-12-31, 12 photos.");
  });
});

describe("the outgoing planner payload", () => {
  it("is built from the whitelisted fields only and refuses anything else", () => {
    const brief = { title: "Launch", scope: "Menu shoot", deliverables: TEMPLATES.shoot.deliverables, privateNotes: SYN.rate } as unknown as PlannerBrief;
    expect(() => plannerRequest(brief, ["photographer"])).toThrow(/non-whitelisted/);
    const withAgency = { title: "Launch", scope: "Menu shoot", deliverables: TEMPLATES.shoot.deliverables, agency: { name: SYN.client } } as unknown as PlannerBrief;
    expect(() => plannerRequest(withAgency, ["photographer"])).toThrow(/agency/);
    const user = plannerRequest({ title: `T (private: ${SYN.rate})`, scope: `S\nprivate: ${SYN.client}`, deliverables: [{ key: "photo_session; drop", quantity: 2, platform: null }] }, ["photographer", "x y"]);
    expect(user).not.toContain(SYN.rate);
    expect(user).not.toContain(SYN.client);
    expect(user).toContain("photo_sessiondrop×2");
    expect(user).toContain("Role keys: photographer, xy");
  });
  it("never carries synthetic confidential content when a plan is created with private notes", async () => {
    const seen: { system: string; user: string }[] = [];
    const call = async (system: string, user: string) => { seen.push({ system, user }); return `[{"title":"Everything","deliverableKeys":["photo_session","feed_posts"],"roles":["photographer"]}]`; };
    const r = await createPlan(buyer, {
      title: "Café launch",
      scope: `Menu shoot and posts (private: ${SYN.rate}). **Private:** ${SYN.client}.\nخاص: ${SYN.arabic}\nprivate:\n${SYN.multi}\n${SYN.phone}\n\nThree posts a week.`,
      deliverables: TEMPLATES.shoot.deliverables,
      useAssistant: true,
      privateNotes: `Quote ${SYN.rate} to ${SYN.client}; call ${SYN.phone}`,
    }, call, async () => true);
    expect(r.reason).toBe("ok");
    expect(seen).toHaveLength(1);
    const payload = JSON.stringify(seen[0]);
    for (const v of Object.values(SYN)) expect(payload, v).not.toContain(v);
    expect(payload).not.toContain("0123");
    expect(payload).not.toContain(buyer.name); // the agency record is not part of the request
    expect(payload).not.toContain(buyer.id);
    expect(payload).not.toContain(rosterNote); // nor roster notes
    expect(seen[0].user).toContain("Three posts a week.");
    const plan = await getPlan(buyer.id, r.id);
    expect(plan?.privateNotes).toContain(SYN.rate); // stored for the agency's own eyes
    expect(plan?.brief).not.toContain(SYN.rate); // the stored brief is the redacted one
  });
});

describe("the daily assistant budget is an atomic, durable reservation", () => {
  const day = new Date("2026-10-05T10:00:00Z");
  it("grants exactly the budget per agency and UTC day, and nothing more under concurrent requests", async () => {
    const results = await Promise.all(Array.from({ length: ASSISTANT_DAILY_BUDGET + 5 }, () => reserveAssistantCall(quota.id, day)));
    expect(results.filter(Boolean)).toHaveLength(ASSISTANT_DAILY_BUDGET);
    expect(await assistantCallsUsed(quota.id, day)).toBe(ASSISTANT_DAILY_BUDGET);
    expect(await reserveAssistantCall(quota.id, day)).toBe(false);
    expect(await assistantCallsUsed(quota.id, day)).toBe(ASSISTANT_DAILY_BUDGET); // a refusal does not touch the row
    expect(await reserveAssistantCall(other.id, day)).toBe(true); // per agency
  });
  it("rolls over at the UTC day boundary and not before", async () => {
    expect(usageDay(new Date("2026-10-05T23:59:59Z"))).toBe("2026-10-05");
    expect(usageDay(new Date("2026-10-06T00:00:00Z"))).toBe("2026-10-06");
    expect(await reserveAssistantCall(quota.id, new Date("2026-10-05T23:59:59.999Z"))).toBe(false);
    expect(await reserveAssistantCall(quota.id, new Date("2026-10-06T00:00:00.000Z"))).toBe(true);
    expect(await assistantCallsUsed(quota.id, new Date("2026-10-06T12:00:00Z"))).toBe(1);
    expect(await assistantCallsUsed(quota.id, day)).toBe(ASSISTANT_DAILY_BUDGET); // yesterday's row is untouched
  });
  it("is spent by the planner whether the call succeeds, fails, times out or returns junk, and never when refused or without a provider", async () => {
    const brief: PlannerBrief = { title: "Launch", scope: "Menu shoot", deliverables: TEMPLATES.shoot.deliverables };
    const at = new Date("2026-10-07T09:00:00Z");
    const roles = ["photographer"];
    const ok = async () => `[{"title":"Everything","deliverableKeys":["photo_session","feed_posts"],"roles":["photographer"]}]`;
    expect((await structureBrief(paths.id, brief, roles, ok, undefined, at)).reason).toBe("ok");
    expect((await structureBrief(paths.id, brief, roles, async () => { throw new Error("boom"); }, undefined, at)).reason).toBe("error");
    expect((await structureBrief(paths.id, brief, roles, async () => { throw new Error("timeout"); }, undefined, at)).reason).toBe("timeout");
    expect((await structureBrief(paths.id, brief, roles, async () => "no json", undefined, at)).reason).toBe("no_json");
    expect((await structureBrief(paths.id, brief, roles, async () => `[{"title":"X","deliverableKeys":["ad_campaigns"]}]`, undefined, at)).reason).toBe("invalid");
    expect(await assistantCallsUsed(paths.id, at)).toBe(5);
    // Refused before the reservation: forbidden content costs nothing.
    expect((await structureBrief(paths.id, { ...brief, scope: "x PRIVATE-NOTE-MARKER" }, roles, ok, undefined, at)).reason).toBe("forbidden_content");
    expect((await structureBrief(paths.id, { ...brief, privateNotes: "x" } as unknown as PlannerBrief, roles, ok, undefined, at)).reason).toBe("forbidden_content");
    expect(await assistantCallsUsed(paths.id, at)).toBe(5);
    // Without a provider and without a custom call nothing is reserved either.
    const prev = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "off";
    try {
      expect((await structureBrief(paths.id, brief, roles, undefined, undefined, at)).reason).toBe("no_provider");
    } finally {
      if (prev === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = prev;
    }
    expect(await assistantCallsUsed(paths.id, at)).toBe(5);
  });
  it("is independent of plan rows: deleting plans refunds nothing and plans without the assistant cost nothing", async () => {
    const at = new Date("2026-10-08T09:00:00Z");
    const ok = async () => `[{"title":"Everything","deliverableKeys":["photo_session","feed_posts"],"roles":["photographer"]}]`;
    const made: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await createPlan(rows, { title: `Plan ${i}`, scope: "Menu shoot", deliverables: TEMPLATES.shoot.deliverables, useAssistant: true }, ok, () => reserveAssistantCall(rows.id, at));
      expect(r.reason).toBe("ok");
      made.push(r.id);
    }
    const noAssistant = await createPlan(rows, { title: "Rules only", scope: "Menu shoot", deliverables: TEMPLATES.shoot.deliverables, useAssistant: false }, ok, () => reserveAssistantCall(rows.id, at));
    expect(noAssistant.reason).toBe("rules");
    expect(await assistantCallsUsed(rows.id, at)).toBe(3);
    for (const id of made) expect(await deletePlan(rows.id, id)).toBe(true);
    expect(await assistantCallsUsed(rows.id, at)).toBe(3); // still spent
    const db = await getDb();
    const usage = await db.select().from(collabAiUsage).where(eq(collabAiUsage.agencyId, rows.id));
    expect(usage).toEqual([expect.objectContaining({ day: "2026-10-08", used: 3 })]);
  });
});

let buyer: Agency;
let quota: Agency;
let other: Agency;
let paths: Agency;
let rows: Agency;
let rosterNote = "";
const mk = async (handle: string, teamRoles: string[]) => {
  const u = await createUser(`${handle}@hardening.jo`, "password-1234");
  return createAgency(u.id, { handle, name: `Name ${handle}`, city: "amman", services: ["photography"], kind: "agency", teamRoles });
};
beforeAll(async () => {
  [buyer, quota, other, paths, rows] = await Promise.all([mk("hd.buyer", ["graphic_designer"]), mk("hd.quota", []), mk("hd.other", []), mk("hd.paths", []), mk("hd.rows", [])]);
  const photographer = await mk("hd.photo", ["photographer"]);
  rosterNote = `ROSTER-NOTE-SYN pays ${SYN.rate}`;
  await saveRosterEntry(buyer.id, { providerAgencyId: photographer.id, groupName: "", tags: [], notes: rosterNote, rateFils: 4321000, rateUnit: "day", rateCurrency: "JOD" });
}, 60_000);
