import "./setup-db";
import { beforeAll, describe, expect, it } from "vitest";
import { plannerRequest, type PlannerBrief } from "@/lib/ai/planner";
import { REDACTED, redactBrief } from "@/lib/collab/redact";
import { TEMPLATES } from "@/lib/collab/templates";
import { createAgency } from "@/lib/data/agencies";
import { createPlan, getPlan } from "@/lib/data/collab-plans";
import { saveRosterEntry } from "@/lib/data/collab-roster";
import { createUser } from "@/lib/data/users";
import type { Agency } from "@/lib/db/schema";

// Regressions for the private-marker canaries found by an independent reproduction of
// redactBrief/plannerRequest (2026-09-28), run against the real imported functions.
// Every case asserts three things: the canary is gone from the redacted text, the public
// text around a valid boundary survives, and the constructed planner request (what would
// leave the server) carries no canary.

const C = "CANARY_ALPHA";
const req = (scope: string) => plannerRequest({ title: "Launch", scope, deliverables: TEMPLATES.shoot.deliverables }, ["photographer"]);
function clean(scope: string, ...keep: string[]) {
  const r = redactBrief(scope);
  expect(r, scope).not.toContain(C);
  expect(req(scope), scope).not.toContain(C);
  for (const k of keep) expect(r, `${scope} should keep ${JSON.stringify(k)}`).toContain(k);
  return r;
}

describe("canary 1: a marker whose line holds only decoration after the colon opens a section", () => {
  it("removes to the blank line for **private:**, LF and CRLF, Latin and Arabic, mid-line and line-leading", () => {
    for (const marker of ["**private:**", "__private:__", "*Private*:", "`internal:`", "**خاص:**", "«سري»:", "**ملاحظة خاصة:**", "confidential: **"]) {
      for (const nl of ["\n", "\r\n"]) {
        clean(`Public scope. ${marker}${nl}${C}${nl}${nl}Public again.`, "Public scope.", "Public again.");
        clean(`Public scope.${nl}${marker}${nl}${C}${nl}second ${C}${nl}${nl}Public again.`, "Public scope.", "Public again.");
        clean(`Public scope.${nl}- ${marker}${nl}${C}${nl}public: shoot on Monday`, "Public scope.", "shoot on Monday");
      }
    }
    expect(clean(`Public scope. **private:**\n${C}\n\nPublic again.`)).toBe(`Public scope. ${REDACTED}\n\nPublic again.`);
  });
  it("still treats a marker followed by text on the same line as inline (rest of the line only)", () => {
    expect(clean(`Shoot the menu. **private:** ${C}\nThree posts a week.`, "Shoot the menu.", "Three posts a week.")).toBe(`Shoot the menu. ${REDACTED}\nThree posts a week.`);
    clean(`تصوير القائمة. خاصّ: ${C}\nثلاثة منشورات.`, "تصوير القائمة.", "ثلاثة منشورات.");
  });
});

describe("canary 2: bracketed notes end at the matching close of the same bracket kind", () => {
  it("ignores other bracket kinds inside and keeps the text after the close", () => {
    expect(clean(`Public scope. (private: inner [note] ${C}) Public again.`, "Public scope.", "Public again.")).toBe(`Public scope. ${REDACTED} Public again.`);
    clean(`Public scope. [private: inner (note) {x} ${C}] Public again.`, "Public scope.", "Public again.");
    clean(`Public scope. {private: ${C} (a [b] c)} Public again.`, "Public scope.", "Public again.");
    clean(`Public scope. (خاص: داخل [ملاحظة] ${C}) عام مرة أخرى.`, "Public scope.", "عام مرة أخرى.");
    clean(`Public scope. (private: nested (deeper ${C}) still private ${C}) Public again.`, "Public scope.", "Public again.");
  });
  it("runs an unclosed bracketed note to the end of its paragraph, not the whole brief", () => {
    expect(clean(`Public scope. (private: ${C}\nstill ${C}\n\nPublic again.`, "Public scope.", "Public again.")).toBe(`Public scope. ${REDACTED}\n\nPublic again.`);
    clean(`Public scope. (private: ${C} [never closed`, "Public scope.");
  });
});

describe("canary 3: tagged spans nest; an inner close never exposes the enclosing span's tail", () => {
  it("removes the whole outer span and keeps the text after its own close", () => {
    expect(clean(`Public scope. [private]outer [private]inner[/private]${C}[/private] Public again.`, "Public scope.", "Public again.")).toBe(`Public scope. ${REDACTED} Public again.`);
    clean(`Public scope. <private>outer <private>inner</private>${C}</private> Public again.`, "Public scope.", "Public again.");
    clean(`Public scope. [private]a <private>b</private> ${C}[/private] Public again.`, "Public scope.", "Public again.");
    clean(`Public scope. [خاص]خارجي [خاص]داخلي[/خاص]${C}[/خاص] عام.`, "Public scope.", "عام.");
  });
  it("treats an unclosed span as running to the end of the text and a stray closing tag as plain text", () => {
    expect(clean(`Public scope. [private]outer ${C}\n\nPublic again.`, "Public scope.")).toBe(`Public scope. ${REDACTED}`);
    expect(redactBrief("Public scope. [/private] stays. Then [private]x[/private] tail.")).toBe(`Public scope. [/private] stays. Then ${REDACTED} tail.`);
  });
});

describe("canary 4: Arabic clitic prefixes", () => {
  it("matches conjunction, preposition and article combinations, composed, with and without tashkeel", () => {
    const prefixes = ["", "و", "ف", "ب", "ك", "ل", "ال", "لل", "بال", "كال", "وال", "فال", "وب", "فب", "ول", "فل", "وك", "وبال", "فبال", "وكال", "فكال", "ولل", "فلل"];
    for (const p of prefixes) {
      for (const w of ["خاص", "سري", "داخلي", "خاصّ", "سرّي"]) {
        clean(`نطاق العمل. ${p}${w}: ${C}`, "نطاق العمل.");
        clean(`نطاق العمل.\n${p}${w}:\n${C}\n\nسطر عام.`, "نطاق العمل.", "سطر عام.");
      }
    }
  });
  it("keeps word-boundary protection: words that merely contain or end in a marker are not markers", () => {
    for (const t of ["Speak privately: fine.", "The internals: fine.", "الاختصاص: fine.", "المداخلي: fine.", "نصخاص: fine.", "unconfidential: fine.", "x_private: fine."]) {
      expect(redactBrief(`${t} ${C}`), t).toContain(C);
    }
  });
});

describe("plan creation with every private form present", () => {
  let buyer: Agency;
  const rosterNote = `ROSTER ${C} rate`;
  beforeAll(async () => {
    const u = await createUser("canary.buyer@hardening.jo", "password-1234");
    buyer = await createAgency(u.id, { handle: "canary.buyer", name: `Canary Agency ${C}`, city: "amman", services: ["photography"], kind: "agency", teamRoles: ["graphic_designer"] });
    const p = await createUser("canary.photo@hardening.jo", "password-1234");
    const photographer = await createAgency(p.id, { handle: "canary.photo", name: "Canary Photo", city: "amman", services: ["photography"], kind: "freelancer", teamRoles: ["photographer"] });
    await saveRosterEntry(buyer.id, { providerAgencyId: photographer.id, groupName: "", tags: [], notes: rosterNote, rateFils: 1, rateUnit: "day", rateCurrency: "JOD" });
  }, 60_000);
  it("captures a model payload with no canary from the scope, the title, the private notes, the roster or the agency record", async () => {
    const seen: { system: string; user: string }[] = [];
    const call = async (system: string, user: string) => { seen.push({ system, user }); return `[{"title":"Everything","deliverableKeys":["photo_session","feed_posts"],"roles":["photographer"]}]`; };
    const scope = [
      `Public scope. **private:**\r\n${C}\r\n\r\nPublic again.`,
      `Second paragraph. (private: inner [note] ${C}) Public tail.`,
      `Third. [private]outer [private]inner[/private]${C}[/private] Public tail two.`,
      `نطاق العمل. بالخاص: ${C}`,
      `فالخاص: ${C}\nسطر خاص ثانٍ ${C}\n\nسطر عام أخير.`,
    ].join("\n\n");
    const r = await createPlan(buyer, { title: `Launch (private: ${C})`, scope, deliverables: TEMPLATES.shoot.deliverables, useAssistant: true, privateNotes: `notes ${C}` }, call, async () => true);
    expect(r.reason).toBe("ok");
    expect(seen).toHaveLength(1);
    const payload = JSON.stringify(seen[0]);
    expect(payload).not.toContain(C);
    expect(payload).not.toContain("ROSTER");
    expect(payload).not.toContain(buyer.id);
    for (const k of ["Public scope.", "Public again.", "Public tail.", "Public tail two.", "سطر عام أخير."]) expect(seen[0].user).toContain(k);
    const plan = await getPlan(buyer.id, r.id);
    expect(plan?.brief).not.toContain(C);
    expect(plan?.privateNotes).toBe(`notes ${C}`);
    expect(() => plannerRequest({ title: "x", scope: "y", deliverables: [], privateNotes: C } as unknown as PlannerBrief, [])).toThrow(/non-whitelisted/);
  });
});
