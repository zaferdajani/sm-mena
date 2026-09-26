import { describe, expect, it } from "vitest";
import { PORTFOLIO_CAPTIONS, SAUDI_DEMO_AGENCIES } from "@/lib/db/demo-portfolio";
import { DEMO_PROFILES } from "@/lib/db/demo-profiles";
import { DEMO_TRANSLATIONS } from "@/lib/db/demo-translations";
import { DEMO_AGENCIES } from "@/lib/db/seed";

const arabic = (s: string) => /[؀-ۿ]/.test(s);
const all = [...DEMO_AGENCIES, ...SAUDI_DEMO_AGENCIES] as { handle: string; name: string; bio: string; captions?: string[] }[];

describe("demo agencies in English", () => {
  it("gives every Arabic demo agency an English name, bio, About and strengths", () => {
    for (const a of all.filter((x) => arabic(x.name + x.bio))) {
      const tr = DEMO_TRANSLATIONS[a.handle];
      expect(tr, a.handle).toBeDefined();
      expect(arabic(tr.name + tr.bio), a.handle).toBe(false);
      const profile = DEMO_PROFILES[a.handle];
      if (profile && arabic(profile.about)) {
        expect(tr.about, a.handle).toBeTruthy();
        expect(tr.strengths?.length, a.handle).toBe(profile.strengths.length);
      }
    }
  });

  it("translates every Arabic caption of their posts", () => {
    for (const [handle, tr] of Object.entries(DEMO_TRANSLATIONS)) {
      const own = all.find((a) => a.handle === handle)?.captions ?? [];
      for (const caption of [...(PORTFOLIO_CAPTIONS[handle] ?? []), ...own].filter(arabic)) {
        expect(tr.captions[caption], `${handle}: ${caption}`).toBeTruthy();
      }
      for (const en of Object.values(tr.captions)) expect(arabic(en)).toBe(false);
    }
  });
});
