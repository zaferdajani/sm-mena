// What a model may see (docs/50 §planner, AC23): the agency-approved brief
// after redaction. Contact data, links, credential-looking strings and
// anything after a "private:" marker on its line are removed before the text
// leaves the server. Private roster notes, rates and client identities are
// never part of the input in the first place. Redaction is a safety net, not
// the boundary: the boundary is what createPlan chooses to pass.
const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿]/g;
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const EMAIL = /[\w.+-]+\s*(?:@|\[\s*at\s*\]|\(\s*at\s*\))\s*[\w-]+(?:\s*(?:\.|\[\s*dot\s*\]|\(\s*dot\s*\))\s*[\w-]+)+/gi;
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;
const URL = /\b(?:https?:\/\/|www\.)\S+/gi;
const HANDLE = /(?<![\w])@[\w.]{2,}/g;
const SECRET = /\b(?:api[_ -]?key|password|passcode|token|secret|iban|otp)\b[^\n]*/gi;
// From a "private:" marker to the end of that line, wherever it starts.
const PRIVATE_LINE = /(^|[\s.;,،])(?:private|internal|confidential|سري|خاص)\s*[:：].*$/gim;

export const REDACTED = "[redacted]";

/** Phone-like runs with at least nine digits; ISO dates (eight digits) are kept so schedules survive. */
const phoneOrKeep = (m: string) => ((m.match(/\d/g) ?? []).length >= 9 ? REDACTED : m);

export function redactBrief(text: string, max = 3000) {
  return text
    .replace(INVISIBLE, "")
    .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xf))
    .replace(PRIVATE_LINE, (_m, lead: string) => `${lead}${REDACTED}`)
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
