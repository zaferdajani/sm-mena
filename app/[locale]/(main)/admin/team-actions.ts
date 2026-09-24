"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { verifySecondFactor } from "@/lib/auth/mfa";
import { verifyPassword } from "@/lib/auth/password";
import { ASSIGNABLE_ROLES } from "@/lib/auth/permissions";
import { createSession, destroySession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import {
  StaffActionError,
  acceptStaffInvite,
  createStaffInvite,
  revokeStaffInvite,
  setStaffDisabled,
  setStaffExpiry,
  setStaffRole,
  transferOwnership,
} from "@/lib/data/staff";
import { getUserByEmail } from "@/lib/data/users";

// Every action here is owner-only (staff.manage), checked on the server.

export type TeamState = { ok?: boolean; error?: string; token?: string; email?: string } | undefined;

const refresh = () => revalidatePath("/[locale]/admin", "layout");
const dateOrNull = z.union([z.literal(""), z.string().date()]).transform((d) => (d ? new Date(`${d}T23:59:59Z`) : null));

async function run(fn: () => Promise<TeamState | void>): Promise<TeamState> {
  try {
    const result = await fn();
    refresh();
    return result ?? { ok: true };
  } catch (e) {
    if (e instanceof StaffActionError) return { error: e.code };
    throw e;
  }
}

export async function inviteStaffAction(_: TeamState, formData: FormData): Promise<TeamState> {
  const owner = await requireStaff("staff.manage");
  const parsed = z
    .object({ email: z.string().trim().email().max(200), role: z.enum(ASSIGNABLE_ROLES), until: dateOrNull })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  if (parsed.data.until && parsed.data.until <= new Date()) return { error: "invalidDate" };
  return run(async () => {
    const { token, invite } = await createStaffInvite(owner.id, { email: parsed.data.email, role: parsed.data.role, accessUntil: parsed.data.until });
    return { ok: true, token, email: invite.email };
  });
}

export async function revokeInviteAction(formData: FormData) {
  const owner = await requireStaff("staff.manage");
  await revokeStaffInvite(owner.id, z.string().uuid().parse(formData.get("id")));
  refresh();
}

export async function updateStaffAction(_: TeamState, formData: FormData): Promise<TeamState> {
  const owner = await requireStaff("staff.manage");
  const parsed = z
    .object({
      userId: z.string().uuid(),
      op: z.enum(["role", "expiry", "disable", "enable"]),
      role: z.enum(ASSIGNABLE_ROLES).optional(),
      until: dateOrNull.optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;
  return run(async () => {
    if (d.op === "role" && d.role) await setStaffRole(owner.id, d.userId, d.role);
    else if (d.op === "expiry") await setStaffExpiry(owner.id, d.userId, d.until ?? null);
    else if (d.op === "disable" || d.op === "enable") await setStaffDisabled(owner.id, d.userId, d.op === "disable");
    else return { error: "invalid" };
  });
}

/** Moves ownership after the owner re-enters their password and an authenticator code. */
export async function transferOwnershipAction(_: TeamState, formData: FormData): Promise<TeamState> {
  const owner = await requireStaff("staff.manage");
  if (owner.role !== "owner") return { error: "owner" };
  if (!rateLimit(`transfer:${owner.id}`, 5, 15 * 60 * 1000)) return { error: "rateLimited" };
  const parsed = z
    .object({ userId: z.string().uuid(), password: z.string().min(1).max(200), code: z.string().trim().min(6).max(32), confirm: z.literal("on") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const full = await getUserByEmail(owner.email);
  if (!full || !(await verifyPassword(parsed.data.password, full.passwordHash))) return { error: "badPassword" };
  if (!full.totpEnabledAt) return { error: "ownerNeedsMfa" };
  if (!(await verifySecondFactor(owner.id, parsed.data.code))) return { error: "badCode" };
  const result = await run(() => transferOwnership(owner.id, parsed.data.userId));
  if (result?.error) return result;
  return redirect({ href: "/admin", locale: await getLocale() });
}

// ---------- invitation acceptance (public page, token-gated) ----------

export async function acceptInviteAction(_: TeamState, formData: FormData): Promise<TeamState> {
  const parsed = z
    .object({ token: z.string().min(10).max(100), password: z.string().min(12).max(200), confirm: z.string() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "weakPassword" };
  if (parsed.data.password !== parsed.data.confirm) return { error: "mismatch" };
  let userId: string;
  try {
    userId = (await acceptStaffInvite(parsed.data.token, parsed.data.password)).id;
  } catch (e) {
    if (e instanceof StaffActionError) return { error: e.code };
    throw e;
  }
  await destroySession();
  await createSession(userId);
  // Two-factor sign-in comes next: staff can only reach the enrolment page until it's on.
  return redirect({ href: "/admin/security", locale: await getLocale() });
}
