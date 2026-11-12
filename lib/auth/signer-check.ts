import "server-only";
import { z } from "zod";
import { checkCode, emailCodesAvailable, issueCode, sendCodeEmail, showCodesOnScreen } from "@/lib/auth/email-code";

// Who signs from a private link (QA H-01). The link alone proves nothing: whoever signs first
// proves an email address with a one-time code. When the agency entered the client's email,
// only that address can sign; otherwise the signer's own address is recorded with the signature.

const emailField = z.string().trim().toLowerCase().email().max(200);
const codeField = z.string().trim().regex(/^\d{6}$/);

export type SignerError = "email" | "wrongEmail" | "unavailable" | "sendFailed" | "verify" | "badCode" | "expired" | "tooMany";

/** The address a code goes to: the one on the agreement, or (when it has none) the one the signer typed. */
export function signerEmail(expected: string | null | undefined, typed: unknown): { email: string } | { error: SignerError } {
  if (expected) {
    const fixed = emailField.safeParse(expected);
    return fixed.success ? { email: fixed.data } : { error: "email" };
  }
  const parsed = emailField.safeParse(typed);
  return parsed.success ? { email: parsed.data } : { error: "email" };
}

/** "s•••@example.com": enough for the signer to recognise their address, not enough to read it off the page. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "•••";
  return `${user[0]}${"•".repeat(Math.min(Math.max(user.length - 1, 3), 6))}@${domain}`;
}

/** Sends the signing code. Returns the code itself only where codes are shown on screen (tests, local development). */
export async function sendSignerCode(email: string): Promise<{ ok: true; shownCode?: string } | { error: SignerError }> {
  if (!emailCodesAvailable()) return { error: "unavailable" };
  const code = await issueCode(email);
  if (showCodesOnScreen()) return { ok: true, shownCode: code };
  return (await sendCodeEmail(email, code, "sign")) ? { ok: true } : { error: "sendFailed" };
}

/** Checks the signer's code. A right code is used up, so one code signs once. */
export async function verifySigner(email: string, code: unknown): Promise<{ ok: true } | { error: SignerError }> {
  const parsed = codeField.safeParse(code);
  if (!parsed.success) return { error: "verify" };
  const result = await checkCode(email, parsed.data);
  return result === "ok" ? { ok: true } : { error: result };
}
