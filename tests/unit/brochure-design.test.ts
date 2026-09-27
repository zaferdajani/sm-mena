import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (name: string) => readFileSync(name, "utf8");
const luminance = (hex: string) => {
  const rgb = hex.match(/[0-9a-f]{2}/gi)!.map((v) => parseInt(v, 16) / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
};
const contrast = (a: string, b: string) => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
};

describe("approved brochure design contract", () => {
  it("uses Noto Sans Arabic at the root, not the previous font loaders", () => {
    const layout = source("app/[locale]/layout.tsx");
    expect(layout).toContain("Noto_Sans_Arabic");
    expect(layout).toContain('data-design-system="brochure-v1"');
    expect(layout).not.toMatch(/IBM_Plex|Readex_Pro|Amiri/);
    const css = source("app/globals.css");
    expect(css).toContain("--background: #f8f6ef");
    expect(css).toContain("--primary: #106b4c");
    expect(css).toContain("--font-noto-arabic");
  });
  it("uses the repository logo rather than an improvised letter", () => {
    const brand = source("components/brand-lockup.tsx");
    expect(brand).toContain('/brand/mark-192.png');
    expect(brand).toContain('lang="ar"');
    expect(brand).toContain('سوّق');
  });
  it("keeps sufficient text contrast in both themes and on media", () => {
    for (const [fg, bg] of [
      ["#102e25", "#f8f6ef"], ["#4c6257", "#fffdf7"], ["#ffffff", "#106b4c"],
      ["#6d592f", "#f8f6ef"], ["#f8f6ef", "#18352a"], ["#b9ccbd", "#18352a"],
      ["#102e25", "#8bc6a6"], ["#f0cf82", "#102e25"],
    ]) expect(contrast(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });
  it("the invitation has manual market, language and theme controls", () => {
    const teaser = source("components/teaser/teaser-view.tsx");
    for (const name of ["CountryPicker", "LocaleSwitcher", "ThemeToggle", "ReleaseStamp"]) expect(teaser).toContain(`<${name}`);
    expect(teaser).not.toContain('className="teaser-night');
    expect(teaser).toContain('/assets/world/scene-01-poster.jpg');
    expect(teaser).toContain('href="/join"');
  });
});
