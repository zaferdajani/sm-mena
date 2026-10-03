import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Physical direction utilities break right-to-left layouts. Use logical
// ones instead: ms/me, ps/pe, start/end, text-start/text-end,
// rounded-s/rounded-e, border-s/border-e.
const physicalDirection =
  /(^|\s|:)-?((ml|mr|pl|pr|scroll-m[lr]|scroll-p[lr])-|(left|right)-(\d|\[|px|auto|full)|(rounded|border)-([lr]|[tb][lr])(-|\s|$)|text-(left|right)(\s|$))/;

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.tsx"],
    // shadcn components are vendored and already RTL-aware (rtl: true).
    ignores: ["components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=${physicalDirection}]`,
          message:
            "Use logical Tailwind classes (ms/me, ps/pe, start/end, text-start/text-end) so RTL works.",
        },
        {
          selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=${physicalDirection}]`,
          message:
            "Use logical Tailwind classes (ms/me, ps/pe, start/end, text-start/text-end) so RTL works.",
        },
      ],
    },
  },
  {
    // Shared brains (docs/architecture/mobile-and-api-roadmap.md §3): business rules, catalogs and input
    // contracts a native client will import. They must stay free of Next.js, React, the database and
    // request context; tests/unit/boundaries.test.ts checks the same list file by file.
    files: ["lib/core/**/*.ts", "lib/validation/**/*.ts", "lib/api/errors.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "lib/core is framework-free." },
            { name: "server-only", message: "lib/core must also load in a native client and in plain Node tests." },
            { name: "next-intl", message: "Use use-intl (createTranslator) or take a translator argument." },
            { name: "next-intl/server", message: "Take locale and translators as arguments; keep the Next wrapper outside lib/core." },
            { name: "@/lib/db", message: "lib/core never touches the database; pass data in." },
            { name: "@/i18n/navigation", message: "lib/core never routes." },
          ],
          patterns: [
            { group: ["next", "next/*", "react-dom", "react-dom/*", "@/lib/db/*", "next-intl/*"], message: "lib/core is framework-free (docs/architecture/mobile-and-api-roadmap.md §3)." },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    // Vendored ffmpeg.wasm engine, copied from node_modules at build time.
    "public/engines/**",
    // Marketing recording/render scripts (Node CommonJS), not app code.
    "marketing/tools/**",
  ]),
]);

export default eslintConfig;
