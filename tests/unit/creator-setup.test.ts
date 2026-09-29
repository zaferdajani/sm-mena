import { describe, expect, it } from "vitest";
import arRoot from "@/messages/ar.json";
import enRoot from "@/messages/en.json";
import { captionStructure, creatorSetupProgress, PORTFOLIO_EXAMPLES } from "@/lib/creator/setup";

const ar = arRoot.CreatorSetup;
const en = enRoot.CreatorSetup;

function paths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => paths(child, prefix ? `${prefix}.${key}` : key)).sort();
}

describe("creator guidance", () => {
  it("counts only a useful profile and genuine published work, not optional integrations", () => {
    expect(creatorSetupProgress({ bio: "", services: [], postCount: 0 })).toEqual({ profile: false, work: false, completed: 0, total: 2 });
    expect(creatorSetupProgress({ bio: "   ", services: ["photography"], postCount: 0 }).profile).toBe(false);
    expect(creatorSetupProgress({ bio: "I photograph products", services: ["photography"], postCount: 1 })).toEqual({ profile: true, work: true, completed: 2, total: 2 });
    expect(creatorSetupProgress({ bio: "", services: [], postCount: Number.NaN }).work).toBe(false);
  });
  it("never overwrites an existing caption with a tutorial template", () => {
    expect(captionStructure("My actual work", en.structure)).toBeNull();
    expect(captionStructure("شغلي الحقيقي", ar.structure)).toBeNull();
    expect(captionStructure(" \n ", en.structure)).toBe(en.structure);
    expect(captionStructure("", "x".repeat(3000))).toHaveLength(2200);
  });
  it("has equivalent Arabic/English catalogs and all example fields", () => {
    expect(paths(ar)).toEqual(paths(en));
    expect(Object.keys(en.examples)).toEqual([...PORTFOLIO_EXAMPLES]);
    expect(Object.keys(ar.examples)).toEqual([...PORTFOLIO_EXAMPLES]);
    for (const copy of [ar, en]) {
      expect(copy.structure.length).toBeLessThan(2200);
      for (const key of PORTFOLIO_EXAMPLES) expect(Object.values(copy.examples[key]).every((text) => text.trim().length > 0)).toBe(true);
    }
  });
});
