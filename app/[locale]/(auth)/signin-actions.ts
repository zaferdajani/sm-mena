"use server";

import { randomBytes } from "node:crypto";
import { redirect as nextRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { checkCode, emailCodesAvailable, issueCode, sendCodeEmail, showCodesOnScreen } from "@/lib/auth/email-code";
import { createSession } from "@/lib/auth/session";
import { mergeDeviceInteractions } from "@/lib/data/interactions";
import { createUser, getUserByEmail } from "@/lib/data/users";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { getVisitorId } from "@/lib/visitor";

// Client accounts (docs/41): business owners sign in with a code sent to
// their email, to follow agencies and save and like work on any device.

export type SignInState = { step?: "code"; email?: string; shownCode?: string; error?: string } | undefined;

const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200), consent: z.literal("on") });
const codeSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200), code: z.string().trim().regex(/^\d{6}$/) });

/** Where to go after signing in: a path on this site only. */
const safeNext = (next: unknown, locale: string) => (typeof next === "string" && /^\/[^/\\]/.test(next) ? next.slice(0, 300) : `/${locale}/saved`);

export async function requestCodeAction(_: SignInState, formData: FormData): Promise<SignInState> {
  const raw = Object.fromEntries(formData);
  if (raw.consent !== "on") return { error: "consent" };
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) return { error: "email" };
  const { email } = parsed.data;
  if (!emailCodesAvailable()) return { error: "unavailable" };
  const ip = await clientIp();
  if (!rateLimit(`code:${ip}`, 10, 60 * 60 * 1000) || !rateLimit(`code:${email}`, 5, 60 * 60 * 1000)) return { error: "rateLimited" };
  // Agencies and staff sign in with their password (and two-factor code).
  const existing = await getUserByEmail(email);
  if (existing && existing.role !== "client") return { error: "useLogin" };
  const code = await issueCode(email);
  if (showCodesOnScreen()) return { step: "code", email, shownCode: code };
  if (!(await sendCodeEmail(email, code))) return { error: "sendFailed" };
  return { step: "code", email };
}

export async function verifyCodeAction(_: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = codeSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!parsed.success) return { step: "code", email, error: "badCode" };
  if (!rateLimit(`verify:${await clientIp()}`, 30, 15 * 60 * 1000)) return { step: "code", email, error: "rateLimited" };
  const result = await checkCode(parsed.data.email, parsed.data.code);
  if (result !== "ok") return { step: "code", email, error: result };
  let user = await getUserByEmail(parsed.data.email);
  if (user && user.role !== "client") return { error: "useLogin" };
  // First sign-in creates the account. It has no usable password: codes only.
  if (!user) user = await createUser(parsed.data.email, randomBytes(32).toString("base64url"), "client");
  await createSession(user.id);
  await mergeDeviceInteractions(await getVisitorId(), user.id);
  nextRedirect(safeNext(formData.get("next"), await getLocale()));
}
