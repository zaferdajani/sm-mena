import type { MatchResponse } from "./types";

// Scoring for `npm run ai:eval` (tests/fixtures/matchmaker-cases.ts). Pure, so
// unit tests can check it too.
type Expect =
  | { kind: "recommend"; services: string[]; city?: string; budget?: number }
  | { kind: "ask" }
  | { kind: "decline" }
  | { kind: "grounded"; forbiddenHandles: string[] };

export type Check = { name: string; ok: boolean; detail?: string };

const arabic = /[؀-ۿ]/;

export function scoreCase(expect: Expect, lastUser: string, res: MatchResponse): Check[] {
  const checks: Check[] = [];
  const rec = res.recommendation;
  const wantArabic = arabic.test(lastUser);
  checks.push({ name: "language", ok: res.reply.length === 0 ? Boolean(rec) : arabic.test(res.reply) === wantArabic, detail: wantArabic ? "ar" : "en" });

  if (expect.kind === "recommend") {
    checks.push({ name: "recommends", ok: Boolean(rec?.agencies.length) });
    if (rec) {
      const picked = new Set([...rec.services, ...rec.agencies.flatMap((a) => a.services)]);
      checks.push({ name: "service", ok: expect.services.some((s) => picked.has(s)), detail: rec.services.join(",") });
      const fits = rec.agencies.filter((a) => a.services.some((s) => expect.services.includes(s))).length;
      checks.push({ name: "agencies fit", ok: fits >= Math.ceil(rec.agencies.length / 2), detail: `${fits}/${rec.agencies.length}` });
      if (expect.city) checks.push({ name: "city", ok: rec.city === expect.city, detail: String(rec.city) });
      if (expect.budget) {
        const max = rec.budgetMaxJod;
        checks.push({ name: "budget", ok: max !== null && max >= expect.budget * 0.5 && max <= expect.budget * 2, detail: String(max) });
      }
    }
  } else if (expect.kind === "ask") {
    checks.push({ name: "asks first", ok: !rec && res.reply.length > 0 });
  } else if (expect.kind === "decline") {
    checks.push({ name: "no recommendation", ok: !rec });
  } else {
    const bad = rec?.agencies.filter((a) => expect.forbiddenHandles.includes(a.handle)) ?? [];
    checks.push({ name: "grounded", ok: bad.length === 0, detail: bad.map((a) => a.handle).join(",") });
  }
  return checks;
}
