import { runInNewContext } from "node:vm";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { themeScript, THEME_KEY } from "../../lib/theme";

describe("server-safe saved-theme bootstrap", () => {
  it("is a real script value imported from outside the client boundary", () => {
    expect(typeof themeScript).toBe("string");
    expect(readFileSync("app/[locale]/layout.tsx", "utf8")).toContain('import { themeScript } from "@/lib/theme"');
  });
  for (const saved of [null, "light", "dark", "invalid"]) {
    it(`applies only the explicit saved preference: ${saved}`, () => {
      const dataset: { theme?: string } = { theme: "dark" };
      const documentElement = { dataset, removeAttribute: (key: string) => { if (key === "data-theme") delete dataset.theme; } };
      runInNewContext(themeScript, { document: { documentElement }, localStorage: { getItem: (key: string) => key === THEME_KEY ? saved : null } });
      expect(dataset.theme).toBe(saved === "dark" ? "dark" : undefined);
    });
  }
  it("does not crash or reset page state when storage is blocked", () => {
    const dataset = { theme: "dark" };
    expect(() => runInNewContext(themeScript, { document: { documentElement: { dataset } }, localStorage: { getItem: () => { throw new Error("blocked"); } } })).not.toThrow();
    expect(dataset.theme).toBe("dark");
  });
});
