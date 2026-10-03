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

// Private markers, Latin and Arabic (matched after tashkeel is stripped and CRLF is normalised).
//
// Grammar. A marker word is one of: private, private note(s), internal, confidential,
// do not send, not for the supplier, خاص, سري, داخلي, لا يرسل, ملاحظة خاصة, للداخل.
// An Arabic word may carry the clitic prefixes of written Arabic: an optional conjunction
// (و or ف), then an optional preposition (ب, ك or ل) and/or the article (ال), with ل+ال
// written لل: خاص, الخاص, بالخاص, للخاص, وخاص, والخاص, فبالخاص, ولخاص … The whole token must
// start at a word boundary (not preceded by a letter, digit or underscore), so "privately:"
// and words that merely end in a marker are not markers. Markdown decoration (* _ ~ ` " ' « »)
// may surround the word and follow the colon.
//
// Forms and policy (the rule errs toward removal, and never removes text after a valid
// closing boundary):
//  - tagged span  [private] … [/private]  or  <private> … </private>: removed exactly; tags
//    nest (an inner [/private] closes only the inner span); an unclosed span runs to the end
//    of the text (malformed = conservative);
//  - bracketed note  (private: …)  [private: …]  {private: …}: removed to the matching close
//    of the same bracket kind (other brackets inside do not close it); if never closed, to
//    the end of its paragraph (next blank line) or the end of the text;
//  - section  a marker that starts its line (after a bullet, number or heading mark), or a
//    marker after which the rest of the line is empty (decoration aside): removed to the next
//    blank line, to a line starting with end:/public:/عام:/نهاية:, or to the end of the text;
//  - inline  a marker inside a line with text after it: the rest of that line is removed.
const AR_PREFIX = "(?:[وف]?(?:لل|[بكل]?(?:ال)?))";
const WORD = `(?:private(?:\\s+notes?)?|internal|confidential|do\\s+not\\s+send|not\\s+for\\s+the\\s+supplier|${AR_PREFIX}(?:خاص|سري|داخلي)|لا\\s*يرسل|ملاحظة\\s+خاصة|للداخل)`;
const DECOR = "[*_~`\"'«»]*";
const DECOR_OR_SPACE = /[*_~`"'«»\s]/gu;
const NOT_IN_WORD = "(?<![\\p{L}\\p{N}_])";
const LINE_LEAD = /^[ \t]*(?:[•\-*+]|\d+[.)]|#{1,6})?[ \t]*$/u;
const TAG = new RegExp(`\\[\\s*(/?)\\s*${WORD}\\s*\\]|<\\s*(/?)\\s*${WORD}\\s*>`, "giu");
const BRACKET_OPEN = new RegExp(`([(\\[{])\\s*${DECOR}${WORD}${DECOR}\\s*[:：]`, "giu");
const MARKED = new RegExp(`${NOT_IN_WORD}${DECOR}${WORD}${DECOR}\\s*[:：]${DECOR}`, "giu");
const SECTION_END = /\n[ \t]*\n|\n[ \t]*(?:end|public|عام|نهاية)\s*[:：]/giu;
const CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

/** Index where a section that starts at `from` ends: the next blank line, a public/end line, or the end of the text. */
function sectionEnd(text: string, from: number) {
  SECTION_END.lastIndex = from;
  const m = SECTION_END.exec(text);
  return m ? m.index : text.length;
}

/** Removes the tagged spans, counting nesting; an unclosed span reaches the end of the text. */
function stripTagged(text: string) {
  let out = "";
  let cursor = 0;
  TAG.lastIndex = 0;
  for (let m = TAG.exec(text); m; m = TAG.exec(text)) {
    if (m.index < cursor) continue;
    if (m[1] === "/" || m[2] === "/") continue; // a stray closing tag is plain text
    let depth = 1;
    let end = text.length;
    for (let n = TAG.exec(text); n; n = TAG.exec(text)) {
      depth += n[1] === "/" || n[2] === "/" ? -1 : 1;
      if (depth === 0) {
        end = n.index + n[0].length;
        break;
      }
    }
    out += text.slice(cursor, m.index) + REDACTED;
    cursor = end;
    TAG.lastIndex = end;
  }
  return out + text.slice(cursor);
}

/** Removes bracketed notes to the matching close of the same bracket kind; unclosed ones to the end of the paragraph. */
function stripBracketed(text: string) {
  let out = "";
  let cursor = 0;
  BRACKET_OPEN.lastIndex = 0;
  for (let m = BRACKET_OPEN.exec(text); m; m = BRACKET_OPEN.exec(text)) {
    if (m.index < cursor) continue;
    const open = m[1];
    const close = CLOSE[open];
    let depth = 1;
    let end = -1;
    for (let i = m.index + m[0].length; i < text.length; i++) {
      const ch = text[i];
      if (ch === open) depth++;
      else if (ch === close && --depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end < 0) end = sectionEnd(text, m.index + m[0].length);
    out += text.slice(cursor, m.index) + REDACTED;
    cursor = end;
    BRACKET_OPEN.lastIndex = end;
  }
  return out + text.slice(cursor);
}

/** Removes sections and inline notes introduced by "marker:". */
function stripMarked(text: string) {
  let out = "";
  let cursor = 0;
  MARKED.lastIndex = 0;
  for (let m = MARKED.exec(text); m; m = MARKED.exec(text)) {
    if (m.index < cursor) continue;
    const after = m.index + m[0].length;
    const lineStart = text.lastIndexOf("\n", m.index - 1) + 1;
    const lineEnd = ((i) => (i < 0 ? text.length : i))(text.indexOf("\n", after));
    const startsLine = LINE_LEAD.test(text.slice(lineStart, m.index));
    const restEmpty = text.slice(after, lineEnd).replace(DECOR_OR_SPACE, "") === ""; // "private: **" is still an empty marker line
    const end = startsLine || restEmpty ? sectionEnd(text, after) : lineEnd;
    out += text.slice(cursor, m.index) + REDACTED;
    cursor = end;
    MARKED.lastIndex = end;
  }
  return out + text.slice(cursor);
}

export const REDACTED = "[redacted]";

/** Phone-like runs with at least nine digits; ISO dates (eight digits) are kept so schedules survive. */
const phoneOrKeep = (m: string) => ((m.match(/\d/g) ?? []).length >= 9 ? REDACTED : m);

export function redactBrief(text: string, max = 3000) {
  const normalised = text
    .replace(/\r\n?/g, "\n") // textareas submit CRLF; every rule below reasons in LF
    .replace(INVISIBLE, "")
    .replace(TASHKEEL, "")
    .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xf));
  return stripMarked(stripBracketed(stripTagged(normalised)))
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
