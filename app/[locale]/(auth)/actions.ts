"use server";

import { getLocale } from "next-intl/server";
import { joinSchema, loginSchema } from "@/lib/validation/auth";
import { redirect } from "@/i18n/navigation";
import { verifyPassword } from "@/lib/auth/password";
import { verifySecondFactor } from "@/lib/auth/mfa";
import { isStaffRole } from "@/lib/auth/permissions";
import { completeMfaSession, createSession, destroySession, getPendingMfaUser } from "@/lib/auth/session";
import { audit } from "@/lib/data/agencies";
import { getAgencyByOwner } from "@/lib/data/agencies";
import { registerProvider } from "@/lib/data/provider-signup";
import { claimPioneerFromCookie } from "@/lib/data/pioneers";
import { mergeDeviceInteractions } from "@/lib/data/interactions";
import { getVisitorId } from "@/lib/visitor";
import { getUserByEmail } from "@/lib/data/users";
import { isRateLimited, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";


export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

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
  // This device's follows, likes and saves move to the account (docs/41).
  await mergeDeviceInteractions(await getVisitorId(), user.id);
  if (isStaffRole(user.role)) await audit(user.id, "auth.login", "user", user.id, { mfa: false });
  return redirect({ href: await homeFor(user.id, user.role), locale });
}

async function homeFor(userId: string, role: string) {
  if (isStaffRole(role)) return "/admin";
  if (role === "agent") return "/agent";
  if (role === "client") return "/owner/needs";
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

export async function join(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const fields = { name: raw.name ?? "", handle: raw.handle ?? "", city: raw.city ?? "", whatsapp: raw.whatsapp ?? "", whatsappCountry: raw.whatsappCountry ?? "", ref: raw.ref ?? "", email: raw.email ?? "" };
  const ip = await clientIp();
  if (!rateLimit(`join:${ip}`, 5, 60 * 60 * 1000)) return { error: "rateLimited", fields };

  const parsed = joinSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = String(issue.path[0]);
    const error =
      path === "consent" ? "consentRequired" :
      path === "adult" ? "adultRequired" :
      path === "password" ? "passwordShort" :
      path === "email" ? "invalidEmail" :
      path === "whatsapp" ? "invalidPhone" : "required";
    return { error, fields };
  }
  const data = parsed.data;
  const all = (k: string) => formData.getAll(k).map(String).filter(Boolean);
  // The same rules as the app's POST /api/v1/auth/signup (lib/data/provider-signup.ts).
  const created = await registerProvider({
    ...data,
    whatsappCountry: String(formData.get("whatsappCountry") ?? ""),
    kind: formData.get("kind") === "freelancer" ? "freelancer" : "agency",
    services: all("services"),
    newServices: all("newServices"),
    teamRoles: all("teamRoles"),
    ref: String(formData.get("ref") ?? ""),
    reminders: formData.get("reminders") === "on",
  });
  if ("error" in created) return { error: created.error, fields };
  const user = { id: created.userId };
  // A Pioneer letter's code left by its landing page (docs/57): the seal is given once, here.
  await claimPioneerFromCookie(created.agencyId, user.id).catch(() => null);
  await createSession(user.id);
  const locale = await getLocale();
  // Came through a collaborator's invitation link (docs/48): accept it now, with the fresh account.
  const invite = String(formData.get("invite") ?? "");
  if (invite && (await (await import("@/lib/feature-gate")).canUse("collaboration"))) {
    const { acceptInvite } = await import("@/lib/data/collab-invites");
    const { getAgencyByOwner } = await import("@/lib/data/agencies");
    const me = await getAgencyByOwner(user.id);
    const r = me ? await acceptInvite(me, invite).catch(() => null) : null;
    if (r && "ok" in r) return redirect({ href: "/portfolio-setup?invited=1", locale });
  }
  // A new provider goes straight into the short portfolio setup (docs/53); the full editor stays at /studio/profile.
  return redirect({ href: "/portfolio-setup", locale });
}

export async function logout() {
  await destroySession();
  const locale = await getLocale();
  return redirect({ href: "/", locale });
}
