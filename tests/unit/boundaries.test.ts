import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Shared-brains boundary (docs/architecture/mobile-and-api-roadmap.md §3 step 0): these modules are the
// business rules, catalogs and contracts a future native client would import, so they must stay free of
// Next.js, React, the database and request context. Add a file here when it becomes pure; never remove one
// to make a change compile.
const PURE = [
  "lib/countries.ts",
  "lib/taxonomy.ts",
  "lib/text.ts",
  "lib/dial-codes.ts",
  "lib/founding.ts",
  "lib/price-stats.ts",
  "lib/launch-phase.ts",
  "lib/auth/permissions.ts",
  "lib/auth/policy.ts",
  "lib/contracts/rules.ts",
  "lib/legal/clauses.ts",
  "lib/monetization/entitlements.ts",
  "lib/collab/types.ts",
  "lib/collab/time.ts",
  "lib/collab/redact.ts",
  "lib/account-schema.ts",
  "lib/match-wizard-schema.ts",
  "lib/collab/schemas.ts",
  "lib/api/errors.ts",
];
const FORBIDDEN = [/from\s+["']next(\/|["'])/, /from\s+["']react(-dom)?(\/|["'])/, /["']server-only["']/, /from\s+["']next-intl/, /@\/i18n\/navigation/, /@\/lib\/db(\/|["'])/, /from\s+["']next\/headers["']/];

describe("shared business modules stay framework-free", () => {
  for (const file of PURE) {
    it(file, () => {
      const source = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) expect(source, `${file} matches ${pattern}`).not.toMatch(pattern);
    });
  }
});
