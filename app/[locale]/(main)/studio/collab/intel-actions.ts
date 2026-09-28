"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { feedbackSchema, planSchema, prefsSchema } from "@/lib/collab/schemas";
import { disputeFeedback, leaveFeedback, setFeedbackOptOut } from "@/lib/data/collab-feedback";
import { createPlan, deletePlan } from "@/lib/data/collab-plans";
import { savePrefs } from "@/lib/data/collab-prefs";
import { canUse } from "@/lib/feature-gate";
import { rateLimit } from "@/lib/rate-limit";

// R3 actions (docs/50): planner, collaborator feedback, preferences. Both
// switches and the session on every one; the data layer re-checks ownership.

export type IntelState = { ok?: boolean; error?: string; id?: string; assistant?: string; reason?: string } | undefined;
const refresh = () => revalidatePath("/[locale]", "layout");
const one = (fd: FormData, k: string) => String(fd.get(k) ?? "");

async function gate(key = "act", limit = 120) {
  if (!(await canUse("collaboration")) || !(await canUse("collaboration_intelligence"))) return null;
  const s = await requireAgency();
  return { agency: s.agency, limited: !rateLimit(`collab-intel-${key}:${s.agency.id}`, limit, 60 * 60 * 1000) };
}

export async function createPlanAction(_: IntelState, fd: FormData): Promise<IntelState> {
  const s = await gate("plan", 30);
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  let deliverables: unknown = [];
  try {
    deliverables = JSON.parse(one(fd, "deliverables") || "[]");
  } catch {
    return { error: "invalid" };
  }
  const d = planSchema.safeParse({ title: one(fd, "title"), scope: one(fd, "scope").replace(/\r\n?/g, "\n"), deliverables, useAssistant: fd.get("useAssistant") === "1", privateNotes: one(fd, "privateNotes").replace(/\r\n?/g, "\n") });
  if (!d.success) return { error: "invalid" };
  const r = await createPlan(s.agency, d.data);
  refresh();
  return redirect({ href: `/studio/collab/plan/${r.id}?assistant=${r.assistant}&reason=${r.reason}`, locale: await getLocale() });
}

export async function deletePlanAction(fd: FormData) {
  const s = await gate();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (s && !s.limited && id.success) await deletePlan(s.agency.id, id.data);
  refresh();
  return redirect({ href: "/studio/collab/plan", locale: await getLocale() });
}

export async function leaveFeedbackAction(_: IntelState, fd: FormData): Promise<IntelState> {
  const s = await gate("feedback", 30);
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const d = feedbackSchema.safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: "invalid" };
  const r = await leaveFeedback(s.agency, d.data.workOrderId, d.data);
  refresh();
  return "ok" in r ? { ok: true, id: r.id } : { error: r.error };
}

export async function disputeFeedbackAction(_: IntelState, fd: FormData): Promise<IntelState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const d = z.object({ id: z.string().uuid(), note: z.string().trim().min(3).max(1000) }).safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: "invalid" };
  const r = await disputeFeedback(s.agency, d.data.id, d.data.note);
  refresh();
  return "ok" in r ? { ok: true } : { error: r.error };
}

export async function savePrefsAction(_: IntelState, fd: FormData): Promise<IntelState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const d = prefsSchema.safeParse({ mutedKinds: fd.getAll("mutedKinds").map(String), quietStart: one(fd, "quietStart"), quietEnd: one(fd, "quietEnd") });
  if (!d.success) return { error: "invalid" };
  await savePrefs(s.agency.id, { mutedKinds: d.data.mutedKinds, quietStart: d.data.quietStart === "" ? null : d.data.quietStart, quietEnd: d.data.quietEnd === "" ? null : d.data.quietEnd });
  await setFeedbackOptOut(s.agency.id, fd.get("showFeedback") === "1");
  refresh();
  return { ok: true };
}
