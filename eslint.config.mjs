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
