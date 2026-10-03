import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Shared-brains boundary (docs/architecture/mobile-and-api-roadmap.md §3 step 0): these modules are the
// business rules, catalogs and contracts a future native client would import, so they must stay free of
// Next.js, React, the database and request context. Add a file here when it becomes pure; never remove one
// to make a change compile.
const PURE = [
  // Catalogs (lib/core/catalog)
  "lib/core/catalog/countries.ts",
  "lib/core/catalog/taxonomy.ts",
  "lib/core/catalog/labels.ts",
  "lib/core/catalog/dial-codes.ts",
  "lib/core/catalog/business-types.ts",
  "lib/core/catalog/text.ts",
  "lib/core/catalog/format.ts",
  "lib/core/catalog/full-service.ts",
  "lib/core/catalog/social-links.ts",
  "lib/core/catalog/media-limits.ts",
  "lib/core/catalog/i18n/country.ts",
  "lib/core/catalog/services/catalog.ts",
  "lib/core/catalog/services/role-input.ts",
  // Rules (lib/core/rules)
  "lib/core/rules/launch-phase.ts",
  "lib/core/rules/founding.ts",
  "lib/core/rules/price-stats.ts",
  "lib/core/rules/auth/permissions.ts",
  "lib/core/rules/auth/policy.ts",
  "lib/core/rules/contracts/rules.ts",
  "lib/core/rules/legal/clauses.ts",
  "lib/core/rules/matching/score.ts",
  "lib/core/rules/matching/closeness.ts",
  "lib/core/rules/matching/describe-core.ts",
  "lib/core/rules/monetization/plans.ts",
  "lib/core/rules/monetization/entitlements.ts",
  "lib/core/rules/collab/types.ts",
  "lib/core/rules/collab/time.ts",
  "lib/core/rules/collab/redact.ts",
  // Option builders that take (locale, t) (lib/core/options)
  "lib/core/options/translate.ts",
  "lib/core/options/form.ts",
  "lib/core/options/studio.ts",
  "lib/core/options/country.ts",
  "lib/core/options/serves-note.ts",
  // Input contracts (lib/validation) and the API error contract
  "lib/validation/portfolio-setup.ts",
  "lib/validation/studio.ts",
  "lib/validation/auth.ts",
  "lib/account-schema.ts",
  "lib/match-wizard-schema.ts",
  "lib/collab/schemas.ts",
  "lib/behance/types.ts",
  "lib/api/errors.ts",
];
const FORBIDDEN = [/from\s+["']next(\/|["'])/, /from\s+["']react(-dom)?(\/|["'])/, /["']server-only["']/, /from\s+["']next-intl/, /@\/i18n\/navigation/, /@\/lib\/db(\/|["'])/, /from\s+["']next\/headers["']/];

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("shared business modules stay framework-free", () => {
  it("covers the M1 extraction (≥ 30 files)", () => {
    expect(PURE.length).toBeGreaterThanOrEqual(30);
  });
  it("leaves no next-intl import under lib/ outside the Next wrappers", () => {
    // The wrappers read locale and translators from the request and hand them to lib/core; everything else
    // in lib/ uses use-intl's createTranslator or takes a translator argument.
    const WRAPPERS = new Set(["lib/form-options.ts", "lib/studio-options.ts", "lib/country-options.ts", "lib/serves-note.ts", "lib/auth/guards.ts", "lib/launch-access.ts"]);
    const offenders = listFiles("lib").filter((f) => !WRAPPERS.has(f) && /from\s+["']next-intl|import\(["']next-intl/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
  for (const file of PURE) {
    it(file, () => {
      const source = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) expect(source, `${file} matches ${pattern}`).not.toMatch(pattern);
    });
  }
});
