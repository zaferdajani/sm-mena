import { createHash } from "node:crypto";

// Machine-translation pipeline for the interface (npm run i18n:translate).
// OneClickConvert writes every language by hand; here a model drafts new
// languages from English (with the Arabic original alongside for meaning),
// and this module keeps the drafts safe: only missing or changed strings are
// sent, ICU placeholders and brand names must survive, and anything that
// fails validation stays in English until a person fixes it.

export type Messages = { [key: string]: string | Messages };
export type Flat = Record<string, string>;

/** Brand and platform names that stay exactly as written. */
export const DO_NOT_TRANSLATE = ["Sawwiq", "WhatsApp", "Instagram", "Facebook", "TikTok", "Snapchat", "LinkedIn", "YouTube", "Google", "Threads", "Pinterest", "CliQ", "JOD", "SEO", "PDF", "CSV", "NDA"];

export function flatten(obj: Messages, prefix = ""): Flat {
  const out: Flat = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

/** Rebuilds nested messages in the source's key order. */
export function unflatten(flat: Flat, order: string[]): Messages {
  const root: Messages = {};
  for (const key of order) {
    if (!(key in flat)) continue;
    const parts = key.split(".");
    let node = root;
    for (const p of parts.slice(0, -1)) node = (node[p] ??= {}) as Messages;
    node[parts.at(-1)!] = flat[key];
  }
  return root;
}

export const hashOf = (text: string) => createHash("sha1").update(text).digest("hex").slice(0, 12);

/**
 * ICU argument names ({name}, {count, plural, …}), which plural/select kinds
 * are used, and whether braces balance. In ICU an argument opens at an odd
 * depth (1, 3, …) and a plural/select branch body at an even one, so text in
 * a branch like "one {agency}" is not mistaken for an argument.
 */
export function icuShape(text: string) {
  const args = new Set<string>();
  const kinds = new Set<string>();
  let depth = 0;
  let balanced = true;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      depth++;
      if (depth % 2 === 1) {
        const m = /^\{\s*([A-Za-z0-9_]+)\s*(?:,\s*(plural|select|selectordinal|number|date|time)\b)?/.exec(text.slice(i));
        if (m) {
          args.add(m[1]);
          if (m[2]) kinds.add(m[2]);
        }
      }
    } else if (ch === "}") {
      depth--;
      if (depth < 0) balanced = false;
    }
  }
  return { args: [...args].sort(), kinds: [...kinds].sort(), balanced: balanced && depth === 0 };
}

export type Problem = "empty" | "placeholders" | "syntax" | "brand" | "untranslated";

/** Why a translation can't be used, or null when it's fine. */
export function checkTranslation(source: string, translated: string | undefined, { allowSame = false } = {}): Problem | null {
  if (!translated || !translated.trim()) return "empty";
  const a = icuShape(source);
  const b = icuShape(translated);
  if (!b.balanced) return "syntax";
  if (a.args.join() !== b.args.join() || a.kinds.join() !== b.kinds.join()) return "placeholders";
  for (const term of DO_NOT_TRANSLATE) if (source.includes(term) && !translated.includes(term)) return "brand";
  // Long sentences that come back identical were not translated.
  if (!allowSame && translated === source && /[a-z]{3,}\s+[a-z]{3,}/i.test(source) && !DO_NOT_TRANSLATE.includes(source)) return "untranslated";
  return null;
}

export type State = Record<string, Record<string, string>>; // locale → key → hash of the English it was made from

/** Keys to (re)translate: missing, made from older English, or currently invalid. */
export function planWork(source: Flat, target: Flat, stateForLocale: Record<string, string> = {}, force = false): string[] {
  return Object.keys(source).filter((key) => force || !(key in target) || stateForLocale[key] !== hashOf(source[key]) || checkTranslation(source[key], target[key], { allowSame: true }) !== null);
}

export function batches<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export type Translator = (batch: { key: string; en: string; ar?: string }[], target: { code: string; label: string; rtl: boolean }) => Promise<Record<string, string>>;

/**
 * Translates what's missing or stale. Returns the merged messages, the new
 * state and a report. Strings that fail validation twice keep the English.
 */
export async function runPipeline({
  en,
  ar,
  target,
  existing,
  state,
  translate,
  force = false,
  batchSize = 40,
}: {
  en: Flat;
  ar?: Flat;
  target: { code: string; label: string; rtl: boolean };
  existing: Flat;
  state: Record<string, string>;
  translate: Translator;
  force?: boolean;
  batchSize?: number;
}) {
  const todo = planWork(en, existing, state, force);
  const out: Flat = Object.fromEntries(Object.keys(en).filter((k) => k in existing).map((k) => [k, existing[k]]));
  const nextState: Record<string, string> = Object.fromEntries(Object.entries(state).filter(([k]) => k in en));
  const failed: { key: string; problem: Problem }[] = [];
  const retry: string[] = [];

  const apply = (keys: string[], result: Record<string, string>, final: boolean) => {
    for (const key of keys) {
      const problem = checkTranslation(en[key], result[key]);
      if (!problem) {
        out[key] = result[key];
        nextState[key] = hashOf(en[key]);
      } else if (final) {
        failed.push({ key, problem });
        out[key] = en[key]; // readable fallback; not marked as translated
        delete nextState[key];
      } else retry.push(key);
    }
  };

  for (const batch of batches(todo, batchSize)) {
    const result = await translate(batch.map((key) => ({ key, en: en[key], ar: ar?.[key] })), target).catch(() => ({}) as Record<string, string>);
    apply(batch, result, false);
  }
  // One retry, a few keys at a time, for anything that failed validation.
  for (const batch of batches(retry.splice(0), 5)) {
    const result = await translate(batch.map((key) => ({ key, en: en[key], ar: ar?.[key] })), target).catch(() => ({}) as Record<string, string>);
    apply(batch, result, true);
  }
  return { messages: out, state: nextState, report: { total: Object.keys(en).length, translated: todo.length - failed.length, skipped: Object.keys(en).length - todo.length, failed } };
}

/** Pseudo-translation for layout testing: text outside ICU braces is accented; RTL targets get a right-to-left mark. */
export const pseudoTranslate: Translator = async (batch, target) => {
  const accents: Record<string, string> = { a: "á", e: "é", i: "í", o: "ó", u: "ú", A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú" };
  const protectedTerms = new RegExp(`(${DO_NOT_TRANSLATE.join("|")})`);
  const accent = (text: string) =>
    text
      .split(protectedTerms)
      .map((part) => (DO_NOT_TRANSLATE.includes(part) ? part : part.replace(/[aeiouAEIOU]/g, (c) => accents[c])))
      .join("");
  const pseudo = (text: string) => {
    let depth = 0;
    let out = "";
    let run = "";
    for (const ch of text) {
      if (ch === "{" || ch === "}") {
        out += depth === 0 ? accent(run) : run;
        run = "";
        depth += ch === "{" ? 1 : -1;
        out += ch;
      } else run += ch;
    }
    return out + (depth === 0 ? accent(run) : run);
  };
  return Object.fromEntries(batch.map(({ key, en }) => [key, `${target.rtl ? "\u200F" : ""}⟦${pseudo(en)}⟧`]));
};
