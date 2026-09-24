"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { verifyPassword } from "@/lib/auth/password";
import { verifySecondFactor } from "@/lib/auth/mfa";
import { isStaffRole } from "@/lib/auth/permissions";
import { completeMfaSession, createSession, destroySession, getPendingMfaUser } from "@/lib/auth/session";
import { audit } from "@/lib/data/agencies";
import { createAgency, getAgencyByOwner, isHandleTaken } from "@/lib/data/agencies";
import { createUser, deleteUser, getUserByEmail } from "@/lib/data/users";
import { isRateLimited, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { CITIES } from "@/lib/labels";
import { normalizePhone, validateHandle } from "@/lib/text";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalidCredentials" };
  const { email, password } = parsed.data;
  const ip = await clientIp();
  // Only failed attempts count: 8 wrong passwords per 15 minutes per address and account.
  const key = `login:${ip}:${email.toLowerCase()}`;
  if (isRateLimited(key, 8)) return { error: "rateLimited" };

  const user = await getUserByEmail(email);
  const blocked = user && (user.disabledAt || (user.staffExpiresAt && user.staffExpiresAt < new Date()));
  if (!user || blocked || !(await verifyPassword(password, user.passwordHash))) {
    rateLimit(key, 8, 15 * 60 * 1000);
    return { error: "invalidCredentials" };
  }

  const locale = await getLocale();
  if (user.totpEnabledAt) {
    // Password is right; the session stays locked until the code is verified.
    await createSession(user.id, { mfaPending: true });
    return redirect({ href: "/login/verify", locale });
  }
  await createSession(user.id);
  if (isStaffRole(user.role)) await audit(user.id, "auth.login", "user", user.id, { mfa: false });
  return redirect({ href: await homeFor(user.id, user.role), locale });
}

async function homeFor(userId: string, role: string) {
  if (isStaffRole(role)) return "/admin";
  return (await getAgencyByOwner(userId)) ? "/studio" : "/";
}

export async function verifyLogin(_: FormState, formData: FormData): Promise<FormState> {
  const locale = await getLocale();
  const user = await getPendingMfaUser();
  if (!user) return redirect({ href: "/login", locale });
  const ip = await clientIp();
  // 5 tries per 10 minutes per account (and per IP), then wait.
  if (!rateLimit(`mfa:${user.id}`, 5, 10 * 60 * 1000) || !rateLimit(`mfa-ip:${ip}`, 20, 10 * 60 * 1000)) return { error: "rateLimited" };
  const code = String(formData.get("code") ?? "").trim().slice(0, 32);
  const method = await verifySecondFactor(user.id, code);
  if (!method) return { error: "badCode" };
  await completeMfaSession(user.id);
  if (isStaffRole(user.role)) await audit(user.id, "auth.login", "user", user.id, { mfa: method });
  return redirect({ href: await homeFor(user.id, user.role), locale });
}

export async function cancelLogin() {
  await destroySession();
  return redirect({ href: "/login", locale: await getLocale() });
}

const joinSchema = z.object({
  name: z.string().trim().min(2).max(80),
  handle: z.string().trim().toLowerCase(),
  city: z.enum(CITIES),
  whatsapp: z.string().trim().min(7).max(20),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  consent: z.literal("on"),
});

export async function join(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const fields = { name: raw.name ?? "", handle: raw.handle ?? "", city: raw.city ?? "", whatsapp: raw.whatsapp ?? "", email: raw.email ?? "" };
  const ip = await clientIp();
  if (!rateLimit(`join:${ip}`, 5, 60 * 60 * 1000)) return { error: "rateLimited", fields };

  const parsed = joinSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = String(issue.path[0]);
    const error =
      path === "consent" ? "consentRequired" :
      path === "password" ? "passwordShort" :
      path === "email" ? "invalidEmail" :
      path === "whatsapp" ? "invalidPhone" : "required";
    return { error, fields };
  }
  const data = parsed.data;
  const handleCheck = validateHandle(data.handle);
  if (handleCheck === "invalid") return { error: "handleInvalid", fields };
  if (handleCheck === "reserved") return { error: "handleReserved", fields };
  if (await isHandleTaken(data.handle)) return { error: "handleTaken", fields };
  if (await getUserByEmail(data.email)) return { error: "emailTaken", fields };
  const whatsapp = normalizePhone(data.whatsapp);
  if (!/^\+?\d{8,15}$/.test(whatsapp)) return { error: "invalidPhone", fields };

  const user = await createUser(data.email, data.password).catch(() => null);
  if (!user) return { error: "emailTaken", fields };
  try {
    await createAgency(user.id, { handle: data.handle, name: data.name, city: data.city, whatsapp, phone: whatsapp });
  } catch {
    // e.g. the handle was taken a moment ago; do not leave an orphan account
    await deleteUser(user.id);
    return { error: "handleTaken", fields };
  }
  await createSession(user.id);
  const locale = await getLocale();
  return redirect({ href: "/studio/profile?welcome=1", locale });
}

export async function logout() {
  await destroySession();
  const locale = await getLocale();
  return redirect({ href: "/", locale });
}
