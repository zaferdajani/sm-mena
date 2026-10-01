"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/guards";
import { addProspect, importResearched, linkJoinedProspects, removeProspect, updateProspect } from "@/lib/data/prospects";
import { PROSPECT_STATUSES, prospectInput, prospectPatch, splitServices } from "@/lib/prospects";

// Admin → Prospects (docs/55).

export type ProspectFormState = { error?: string; added?: string; exists?: string; imported?: { added: number; skipped: number } } | undefined;
const refresh = () => revalidatePath("/[locale]/admin/prospects", "page");

export async function addProspectAction(_: ProspectFormState, formData: FormData): Promise<ProspectFormState> {
  const staff = await requireStaff("prospects.manage");
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = prospectInput.safeParse({ ...raw, services: splitServices(raw.services ?? ""), priority: raw.priority === "1" });
  if (!parsed.success) return { error: "invalid" };
  const r = await addProspect(parsed.data, staff.id);
  refresh();
  return r.created ? { added: r.prospect.name } : { exists: r.prospect.name };
}

export async function importResearchedAction(): Promise<ProspectFormState> {
  const staff = await requireStaff("prospects.manage");
  const imported = await importResearched(staff.id);
  await linkJoinedProspects();
  refresh();
  return { imported };
}

export async function setProspectStatusAction(id: string, status: string) {
  const staff = await requireStaff("prospects.manage");
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(PROSPECT_STATUSES) }).safeParse({ id, status });
  if (!parsed.success) return;
  await updateProspect(parsed.data.id, { status: parsed.data.status }, staff.id);
  refresh();
}

export async function setProspectPriorityAction(id: string, priority: boolean) {
  const staff = await requireStaff("prospects.manage");
  if (!z.string().uuid().safeParse(id).success) return;
  await updateProspect(id, { priority: Boolean(priority) }, staff.id);
  refresh();
}

export async function saveProspectDetailsAction(_: ProspectFormState, formData: FormData): Promise<ProspectFormState> {
  const staff = await requireStaff("prospects.manage");
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const id = z.string().uuid().safeParse(raw.id);
  const parsed = prospectPatch.safeParse({ note: raw.note ?? "", website: raw.website ?? "", instagram: raw.instagram ?? "" });
  if (!id.success || !parsed.success) return { error: "invalid" };
  await updateProspect(id.data, parsed.data, staff.id);
  refresh();
  return {};
}

export async function removeProspectAction(id: string) {
  const staff = await requireStaff("prospects.manage");
  if (!z.string().uuid().safeParse(id).success) return;
  await removeProspect(id, staff.id);
  refresh();
}
