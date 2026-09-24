import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/i18n/languages";
import { directionOf, routing } from "@/i18n/routing";
import { countryOfZone } from "@/lib/i18n/country";
import { checkTranslation, flatten, icuShape, planWork, pseudoTranslate, runPipeline, hashOf, unflatten, type Messages } from "@/lib/i18n/pipeline";
import { suggestLocale } from "@/lib/i18n/suggest";

const read = (l: string) => JSON.parse(readFileSync(new URL(`../../messages/${l}.json`, import.meta.url), "utf8")) as Messages;

describe("language registry", () => {
  it("lists every live locale and flags right-to-left ones", () => {
    for (const l of routing.locales) expect(LANGUAGES.find((x) => x.code === l)?.enabled).toBe(true);
    expect(LANGUAGES.filter((l) => l.enabled).map((l) => l.code).sort()).toEqual([...routing.locales].sort());
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("ur")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
  });
});

describe("language offer (location concept from OneClickConvert)", () => {
  const enabled = ["ar", "en"];
  it("reads the country from the device time zone", () => {
    expect(countryOfZone("Asia/Amman")).toBe("JO");
    expect(countryOfZone("Europe/Berlin")).toBe("DE");
    expect(countryOfZone("Mars/Olympus")).toBeNull();
  });
  it("offers, never forces, the language the visitor most likely reads", () => {
    // English phone in Amman reading English → offered Arabic.
    expect(suggestLocale({ current: "en", enabled, browserLanguages: ["en-US"], country: "JO" })).toBe("ar");
    // …already on Arabic → nothing to offer.
    expect(suggestLocale({ current: "ar", enabled, browserLanguages: ["en-US"], country: "JO" })).toBeNull();
    // Arabic phone in Berlin → Arabic wins over the country.
    expect(suggestLocale({ current: "en", enabled, browserLanguages: ["ar-JO", "de"], country: "DE" })).toBe("ar");
    // Visitor abroad on the Arabic default with an English or unknown device → English.
    expect(suggestLocale({ current: "ar", enabled, browserLanguages: ["en-GB"], country: "GB" })).toBe("en");
    expect(suggestLocale({ current: "ar", enabled, browserLanguages: ["ja"], country: "JP" })).toBe("en");
    // Nothing known → no offer.
    expect(suggestLocale({ current: "ar", enabled, browserLanguages: ["ja"], country: null })).toBeNull();
  });
});

describe("messages", () => {
  it("use the same placeholders in Arabic and English for every string", () => {
    const en = flatten(read("en"));
    const ar = flatten(read("ar"));
    const mismatched = Object.keys(en).filter((k) => {
      const a = icuShape(en[k]);
      const b = icuShape(ar[k] ?? "");
      return !b.balanced || a.args.join() !== b.args.join() || a.kinds.join() !== b.kinds.join();
    });
    expect(mismatched).toEqual([]);
  });
});

describe("translation pipeline", () => {
  it("validates placeholders, plural syntax and brand names", () => {
    expect(icuShape("{count, plural, one {# day} other {# days}} left for {name}")).toEqual({ args: ["count", "name"], kinds: ["plural"], balanced: true });
    expect(checkTranslation("Hi {name}", "Salut {name}")).toBeNull();
    expect(checkTranslation("Hi {name}", "Salut {nom}")).toBe("placeholders");
    expect(checkTranslation("Hi {name}", "Salut {name")).toBe("syntax");
    expect(checkTranslation("Send on WhatsApp", "Envoyer sur Whatsapp")).toBe("brand");
    expect(checkTranslation("Send your project to agencies", "Send your project to agencies")).toBe("untranslated");
    expect(checkTranslation("{n} items", "")).toBe("empty");
  });

  it("only sends missing, changed or broken strings", () => {
    const en = { a: "Hello there", b: "Save {n} posts", c: "Changed text now" };
    const target = { a: "Bonjour", b: "Enregistrer {x} posts", c: "Old" };
    const state = { a: hashOf("Hello there"), b: hashOf("Save {n} posts"), c: hashOf("Earlier text") };
    expect(planWork(en, target, state)).toEqual(["b", "c"]);
    expect(planWork({ ...en, d: "New" }, target, state)).toContain("d");
  });

  it("merges translations, retries failures once and keeps English when still broken", async () => {
    const en = { "Nav.home": "Home page", "Nav.count": "{count, plural, one {# post} other {# posts}}", "Nav.brand": "Open Sawwiq now" };
    let calls = 0;
    const flaky = async (batch: { key: string; en: string }[]) => {
      calls++;
      return Object.fromEntries(batch.map(({ key }) => [key, key === "Nav.count" ? "{total} publications" : key === "Nav.brand" ? "Ouvrir Sawwiq" : "Accueil"]));
    };
    const { messages, report, state } = await runPipeline({ en, target: { code: "fr", label: "Français", rtl: false }, existing: {}, state: {}, translate: flaky });
    expect(messages).toEqual({ "Nav.home": "Accueil", "Nav.count": en["Nav.count"], "Nav.brand": "Ouvrir Sawwiq" });
    expect(report.failed).toEqual([{ key: "Nav.count", problem: "placeholders" }]);
    expect(Object.keys(state).sort()).toEqual(["Nav.brand", "Nav.home"]);
    expect(calls).toBe(2);
    expect(unflatten(messages, Object.keys(en))).toEqual({ Nav: { home: "Accueil", count: en["Nav.count"], brand: "Ouvrir Sawwiq" } });
  });

  it("pseudo-translates the whole interface without breaking any string", async () => {
    const en = flatten(read("en"));
    const { report, messages } = await runPipeline({ en, target: { code: "fa", label: "فارسی", rtl: true }, existing: {}, state: {}, translate: pseudoTranslate });
    expect(report.failed).toEqual([]);
    expect(messages["Nav.home"].startsWith("‏⟦")).toBe(true);
  });
});
