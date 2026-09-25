"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/guards";
import { audit } from "@/lib/data/agencies";
import { FEATURE_STATES, isFeatureKey, setFeature } from "@/lib/features";
import { MANUAL_STEPS, setManualTick } from "@/lib/golive";

export type FeatureActionState = { ok?: boolean; error?: string } | undefined;

/** Admin → Features: switch a feature on, to "coming soon" (with pilot agencies) or off. */
export async function setFeatureAction(_: FeatureActionState, formData: FormData): Promise<FeatureActionState> {
  const admin = await requireStaff("features.manage");
  const key = String(formData.get("key") ?? "");
  const state = z.enum(FEATURE_STATES).safeParse(formData.get("state"));
  if (!isFeatureKey(key) || !state.success) return { error: "invalid" };
  const pilots = String(formData.get("pilots") ?? "")
    .split(/[\s,،]+/)
    .filter(Boolean);
  const saved = await setFeature(key, { state: state.data, pilots }, admin.id);
  await audit(admin.id, "feature.set", "feature", key, { state: saved.state, pilots: saved.pilots });
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}

/** Admin → Features → go-live checklist: the owner ticks the steps done outside the platform. */
export async function tickGoLiveAction(step: string, done: boolean) {
  const admin = await requireStaff("features.manage");
  const parsed = z.enum(MANUAL_STEPS).parse(step);
  await setManualTick(parsed, done, admin.id);
  await audit(admin.id, done ? "golive.tick" : "golive.untick", "golive", parsed);
  revalidatePath("/[locale]/admin/features", "page");
}
