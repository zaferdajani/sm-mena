/**
 * Splits a mixed Arabic/Latin string into directional runs and returns them in
 * visual (left-to-right on the page) order.
 *
 * Why this exists: jsPDF already shapes Arabic and reorders pure-Arabic strings
 * correctly, but its bidi pass mangles (and can silently drop) strings that mix
 * Arabic with Latin letters. Drawing each run separately, positioned by us,
 * sidesteps that bug entirely. Ported from TeamManager (src/utils/pdfBidiRuns.ts);
 * the only addition is the `base` parameter for Latin-first (LTR) paragraphs.
 *
 * Pure: no jsPDF, no DOM, no Node APIs.
 */

const ARABIC_CHAR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LATIN_LETTER = /[A-Za-zÀ-ɏ]/;

export type RunDirection = "rtl" | "ltr";

export interface BidiRun {
  text: string;
  dir: RunDirection;
}

export function hasArabic(text: string): boolean {
  return ARABIC_CHAR.test(text);
}

export function hasLatinLetters(text: string): boolean {
  return LATIN_LETTER.test(text);
}

/** True when jsPDF's own bidi pass cannot be trusted with this string. */
export function isMixedScript(text: string): boolean {
  return hasArabic(text) && hasLatinLetters(text);
}

const MIRROR: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<" };
const DIGIT = /[0-9٠-٩۰-۹.,/%-]/;

type Class = "rtl" | "ltr" | "num" | "neutral";

function classifyChar(ch: string): Class {
  if (ARABIC_CHAR.test(ch)) return "rtl";
  if (LATIN_LETTER.test(ch)) return "ltr";
  if (DIGIT.test(ch)) return "num";
  return "neutral";
}

const OPENING: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

/**
 * Gives each matched bracket pair one direction, as the Unicode bidi rule N0
 * does: the paragraph direction when the brackets enclose text of that
 * direction, else the opposite one when they enclose only opposite-direction
 * text that the text before them also shares — so "بصمة (SHA-256)" keeps its
 * brackets around the Latin, and "Botox (Allergan)" keeps them Latin.
 */
function resolveBrackets(chars: string[], classes: Class[], base: RunDirection) {
  const strong = (c: Class): RunDirection | null => (c === "rtl" || c === "ltr" ? c : null);
  const opposite: RunDirection = base === "rtl" ? "ltr" : "rtl";
  const stack: number[] = [];
  const pairs: [number, number][] = [];
  chars.forEach((ch, i) => {
    if (OPENING[ch]) stack.push(i);
    else {
      const open = stack.length ? stack[stack.length - 1] : -1;
      if (open >= 0 && OPENING[chars[open]] === ch) {
        stack.pop();
        pairs.push([open, i]);
      }
    }
  });
  // Outer pairs first, so inner pairs see their enclosing brackets resolved.
  pairs.sort((a, b) => a[0] - b[0]);
  for (const [open, close] of pairs) {
    const inside = new Set(classes.slice(open + 1, close).map(strong).filter(Boolean));
    let dir: RunDirection | null = null;
    if (inside.has(base)) dir = base;
    else if (inside.has(opposite)) {
      let before: RunDirection = base;
      for (let j = open - 1; j >= 0; j--) {
        const s = strong(classes[j]);
        if (s) {
          before = s;
          break;
        }
      }
      dir = before === opposite ? opposite : base;
    }
    if (dir) classes[open] = classes[close] = dir;
  }
}

/**
 * Returns the runs in VISUAL order — the first item is what the reader sees
 * leftmost on the page. `base` is the paragraph direction: "rtl" (default, an
 * Arabic paragraph) lays the logical runs out right to left; "ltr" (an English
 * paragraph quoting an Arabic name) keeps them left to right.
 *
 * Numbers stay with a nearby Latin run (so "120 JOD" reads as one group),
 * whitespace and punctuation between two runs of different direction stay
 * between them, and paired brackets inside right-to-left runs are mirrored the
 * way an RTL reader expects.
 */
export function splitVisualRuns(text: string, base: RunDirection = "rtl"): BidiRun[] {
  const chars = Array.from(text);
  const classes = chars.map(classifyChar);
  resolveBrackets(chars, classes, base);

  const chunks: { text: string; cls: Class }[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const cls = classes[i];
    const last = chunks[chunks.length - 1];
    if (last && last.cls === cls) last.text += ch;
    else chunks.push({ text: ch, cls });
  }

  const isSpace = (c?: { text: string; cls: Class }) => !!c && c.cls === "neutral" && /^\s+$/.test(c.text);
  // A number that did not lean to Latin reads inside the Arabic around it.
  const side = (c: { cls: Class }) => (c.cls === "num" ? "rtl" : c.cls);
  const neighbour = (i: number, step: number) => {
    for (let j = i + step; j >= 0 && j < chunks.length; j += step) {
      if (!isSpace(chunks[j])) return chunks[j];
    }
    return undefined;
  };

  // Numbers lean towards a nearby Latin run; otherwise they read on their own.
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].cls !== "num") continue;
    if (neighbour(i, -1)?.cls === "ltr" || neighbour(i, 1)?.cls === "ltr") chunks[i].cls = "ltr";
  }

  // Neutrals join a neighbour, except a gap between two scripts, which stays a gap.
  const merged: { text: string; cls: Class }[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (c.cls === "neutral") {
      const prev = chunks[i - 1];
      const next = chunks[i + 1];
      const keepGap = isSpace(c) && prev && next && side(prev) !== side(next);
      if (keepGap) {
        // leave it standing on its own
      } else if (isSpace(c) && prev) c.cls = prev.cls;
      else if (prev && next && prev.cls === next.cls && prev.cls !== "neutral") c.cls = prev.cls;
      else if (!next && prev) c.cls = prev.cls;
      else if (!prev && next) c.cls = next.cls;
    }

    const last = merged[merged.length - 1];
    if (last && last.cls === c.cls) last.text += c.text;
    else merged.push({ ...c });
  }

  // A gap left between the two scripts takes the paragraph direction.
  const logical: BidiRun[] = merged.map((c) => {
    const dir: RunDirection = c.cls === "ltr" ? "ltr" : c.cls === "neutral" ? base : "rtl";
    return { text: dir === "ltr" ? c.text : c.text.replace(/[()[\]{}<>]/g, (m) => MIRROR[m] ?? m), dir };
  });

  // RTL base direction: logical order runs right-to-left across the page.
  if (base === "rtl") return logical.reverse();

  // LTR base: runs flow left to right, but a stretch of consecutive
  // right-to-left runs (Arabic word, number, Arabic word) is one embedded
  // right-to-left phrase, so that stretch alone is reversed.
  const visual: BidiRun[] = [];
  let stretch: BidiRun[] = [];
  for (const run of logical) {
    if (run.dir === "rtl") {
      stretch.push(run);
      continue;
    }
    visual.push(...stretch.reverse(), run);
    stretch = [];
  }
  visual.push(...stretch.reverse());
  return visual;
}
