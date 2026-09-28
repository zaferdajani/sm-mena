// What a model may see (docs/50 §planner, AC23): the agency-approved brief
// after redaction. Contact data, links, credential-looking strings and every
// private section are removed before the text leaves the server.
//
// Redaction is the second line. The first is structural: the planner request
// is built from a fixed set of fields (title, deliverable keys, role keys,
// scope); private notes, roster notes, rates, partner and client names and
// the agency's own record are never part of that object (lib/ai/planner.ts
// `plannerRequest` rejects extra keys).

const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿]/g;
const TASHKEEL = /[ً-ْٰـ]/g;
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
// Addresses, including "nour [at] client [dot] jo". Only the spelled-out forms may carry spaces:
// a literal dot never does, so a handle at the end of a sentence cannot swallow the next paragraph.
const EMAIL = /[\w.+-]+[ \t]*(?:@|\[[ \t]*at[ \t]*\]|\([ \t]*at[ \t]*\))[ \t]*[\w-]+(?:(?:\.|[ \t]*(?:\[[ \t]*dot[ \t]*\]|\([ \t]*dot[ \t]*\))[ \t]*)[\w-]+)+/gi;
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;
const URL = /\b(?:https?:\/\/|www\.)\S+/gi;
const HANDLE = /(?<![\w])@[\w.]{2,}/g;
const SECRET = /\b(?:api[_ -]?key|password|passcode|token|secret|iban|otp)\b[^\n]*/gi;

// Private markers, Latin and Arabic (matched after tashkeel is stripped):
// "private:", "**private:**", "(private: …)", "[private] … [/private]",
// "<private>…</private>", "خاص:", "سري:", "داخلي:", "لا يُرسل:", "ملاحظة خاصة:".
// The rule errs toward removal:
//  - a tagged span is removed exactly;
//  - a bracketed note "(private: …)" is removed to its closing bracket;
//  - a marker that starts a line opens a section, removed to the next blank
//    line, to an "end:/public:/عام:/نهاية:" line, or to the end of the text;
//  - a marker in the middle of a line removes the rest of that line.
const MARKER = "(?:private(?:\\s+notes?)?|internal|confidential|do\\s+not\\s+send|not\\s+for\\s+the\\s+supplier|(?:و|ف|ال|وال|لل)?(?:خاص|سري|داخلي)|لا\\s*يرسل|ملاحظة\\s+خاصة|للداخل)";
const DECOR = "[*_~`\"'«»]*";
const NOT_IN_WORD = "(?<![\\p{L}\\p{N}_])";
// What may precede a section marker on its line: list bullets, numbering, Markdown headings.
const LINE_LEAD = "[ \\t]*(?:[•\\-*+]|\\d+[.)]|#{1,6})?[ \\t]*";
const TAGGED = new RegExp(`\\[\\s*${MARKER}\\s*\\][\\s\\S]*?(?:\\[\\s*/\\s*${MARKER}\\s*\\]|$)|<\\s*${MARKER}\\s*>[\\s\\S]*?(?:<\\s*/\\s*${MARKER}\\s*>|$)`, "giu");
const BRACKETED = new RegExp(`[(\\[{]\\s*${DECOR}${MARKER}${DECOR}\\s*[:：][^)\\]}]*(?:[)\\]}]|$)`, "giu");
const SECTION_END = "(?=\\n[ \\t]*\\n|\\n[ \\t]*(?:end|public|عام|نهاية)\\s*[:：]|$)";
const SECTION = new RegExp(`(^|\\n)${LINE_LEAD}${DECOR}${MARKER}${DECOR}\\s*[:：][\\s\\S]*?${SECTION_END}`, "giu");
// A marker inside a line: the rest of that line goes; when nothing follows the marker on its line, the section below it goes too.
const INLINE = new RegExp(`${NOT_IN_WORD}${DECOR}${MARKER}${DECOR}\\s*[:：](?:[ \\t]*(?=\\n)[\\s\\S]*?${SECTION_END}|[^\\n]*)`, "giu");

export const REDACTED = "[redacted]";

/** Phone-like runs with at least nine digits; ISO dates (eight digits) are kept so schedules survive. */
const phoneOrKeep = (m: string) => ((m.match(/\d/g) ?? []).length >= 9 ? REDACTED : m);

export function redactBrief(text: string, max = 3000) {
  return text
    .replace(/\r\n?/g, "\n") // textareas submit CRLF; every rule below reasons in LF
    .replace(INVISIBLE, "")
    .replace(TASHKEEL, "")
    .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xf))
    .replace(TAGGED, REDACTED)
    .replace(BRACKETED, REDACTED)
    .replace(SECTION, (_m, lead: string) => `${lead}${REDACTED}`)
    .replace(INLINE, REDACTED)
    .replace(SECRET, REDACTED)
    .replace(URL, REDACTED)
    .replace(EMAIL, REDACTED)
    .replace(PHONE, phoneOrKeep)
    .replace(HANDLE, REDACTED)
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, max);
}

/** Test markers that must never appear in a model request (unit tests plant them); a tripwire, not the boundary. */
export const FORBIDDEN_MARKERS = ["SECRET-MARKER", "PRIVATE-NOTE-MARKER", "CONTACT-MARKER"];

export function containsForbidden(payload: string) {
  return FORBIDDEN_MARKERS.some((m) => payload.includes(m));
}
