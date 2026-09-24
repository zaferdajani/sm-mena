// Drafts a new interface language from English (Arabic original alongside).
//
//   npm run i18n:translate -- --to fr                 Claude or OpenAI, whichever key is set
//   npm run i18n:translate -- --to ur --provider openai
//   npm run i18n:translate -- --to fa --provider pseudo   offline pseudo-translation for layout/RTL checks
//   npm run i18n:translate -- --to fr --dry-run           show what would be translated
//   npm run i18n:translate -- --to fr --force             redo everything
//
// Only missing or changed strings are sent (messages/.translation-state.json
// remembers which English each string was made from). Placeholders, plural
// syntax and brand names are validated; failures keep the English text and
// are listed. A person fluent in the language should review before the
// language is switched on in i18n/routing.ts.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { LANGUAGES } from "../i18n/languages";
import { DO_NOT_TRANSLATE, flatten, planWork, pseudoTranslate, runPipeline, unflatten, type Messages, type Translator } from "../lib/i18n/pipeline";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const dir = path.join(process.cwd(), "messages");
const read = (file: string) => JSON.parse(readFileSync(path.join(dir, file), "utf8")) as Messages;

const SYSTEM = (label: string, code: string, rtl: boolean) => `You translate the user interface of Sawwiq, a marketplace in Jordan where businesses find, compare and hire social media and marketing agencies. Translate each English UI string into ${label} (${code}${rtl ? ", written right to left" : ""}).

The Arabic original is given where available: it is the authored version, so follow its meaning and tone; English is the reference wording.

Rules:
- Natural, concise interface language, the way a good native product writes it. Not word-for-word.
- Keep ICU MessageFormat exactly: argument names in braces ({name}, {count}, {amount}) stay unchanged. In {x, plural, ...} or {x, select, ...} keep the structure and selector keys (one, other, =0, …) and translate only the text inside each branch; add the plural categories ${label} needs (for example few, many). Keep "#".
- Never translate or transliterate: ${DO_NOT_TRANSLATE.join(", ")}. Keep URLs, emails, numbers and emoji.
- Currency is Jordanian dinar (JOD).
Return only a JSON object mapping every given key to its translation.`;

function parseJson(text: string): Record<string, string> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 ? (JSON.parse(text.slice(start, end + 1)) as Record<string, string>) : {};
}

async function anthropicTranslator(): Promise<Translator> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const model = process.env.I18N_MODEL || process.env.ANTHROPIC_MODEL || process.env.AI_MODEL || "claude-opus-5";
  return async (batch, target) => {
    const res = await client.messages.create({
      model,
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM(target.label, target.code, target.rtl), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: JSON.stringify(batch) }],
    });
    return parseJson(res.content.map((b) => (b.type === "text" ? b.text : "")).join(""));
  };
}

async function openaiTranslator(): Promise<Translator> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI();
  const model = process.env.I18N_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  return async (batch, target) => {
    const res = await client.responses.create({ model, instructions: SYSTEM(target.label, target.code, target.rtl), input: JSON.stringify(batch), text: { format: { type: "json_object" } }, store: false });
    return parseJson(res.output_text);
  };
}

async function main() {
  const code = arg("to");
  const target = LANGUAGES.find((l) => l.code === code);
  if (!target || code === "en") throw new Error(`--to must be one of: ${LANGUAGES.filter((l) => l.code !== "en").map((l) => l.code).join(", ")}`);
  const en = flatten(read("en.json"));
  const ar = flatten(read("ar.json"));
  const file = `${code}.json`;
  const existing = existsSync(path.join(dir, file)) ? flatten(read(file)) : {};
  const statePath = path.join(dir, ".translation-state.json");
  const state = existsSync(statePath) ? (JSON.parse(readFileSync(statePath, "utf8")) as Record<string, Record<string, string>>) : {};
  const force = process.argv.includes("--force");

  const todo = planWork(en, existing, state[code!] ?? {}, force);
  console.log(`${target.label}: ${todo.length} of ${Object.keys(en).length} strings to translate.`);
  if (process.argv.includes("--dry-run") || !todo.length) return;

  const choice = arg("provider") ?? (process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.OPENAI_API_KEY ? "openai" : null);
  if (!choice) throw new Error("Set ANTHROPIC_API_KEY or OPENAI_API_KEY, or use --provider pseudo.");
  const translate = choice === "pseudo" ? pseudoTranslate : choice === "openai" ? await openaiTranslator() : await anthropicTranslator();

  const { messages, state: next, report } = await runPipeline({ en, ar: code === "ar" ? undefined : ar, target, existing, state: state[code!] ?? {}, translate, force });
  writeFileSync(path.join(dir, file), `${JSON.stringify(unflatten(messages, Object.keys(en)), null, 2)}\n`);
  if (choice !== "pseudo") writeFileSync(statePath, `${JSON.stringify({ ...state, [code!]: next }, null, 2)}\n`);
  console.log(`Translated ${report.translated}, unchanged ${report.skipped}, kept in English ${report.failed.length}.`);
  for (const f of report.failed) console.log(`  ${f.problem.padEnd(12)} ${f.key}`);
  console.log(`Wrote messages/${file}. Review it, then add "${code}" to locales in i18n/routing.ts to switch it on.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
