"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAgency } from "@/lib/auth/guards";
import { TEAM_SIZES } from "@/lib/core/catalog/labels";
import { audit, updateAgency } from "@/lib/data/agencies";

// "Make your page stronger" (docs/65 stage 3): the two facts every agency directory shows, saved on
// their own without the long page editor. Both optional; nothing else on the page is touched.

const basicsSchema = z.object({
  teamSize: z.union([z.literal(""), z.enum(TEAM_SIZES)]),
  startingPriceJod: z.union([z.literal(""), z.coerce.number().int().min(1).max(100000)]),
});

export type BasicsState = { ok?: boolean; error?: "invalid" } | undefined;

export async function saveBasicsAction(_: BasicsState, formData: FormData): Promise<BasicsState> {
  const { user, agency } = await requireAgency();
  const parsed = basicsSchema.safeParse({ teamSize: formData.get("teamSize") ?? "", startingPriceJod: formData.get("startingPriceJod") ?? "" });
  if (!parsed.success) return { error: "invalid" };
  const patch = {
    teamSize: parsed.data.teamSize || null,
    startingPriceJod: parsed.data.startingPriceJod === "" ? null : parsed.data.startingPriceJod,
  };
  await updateAgency(agency.id, patch);
  await audit(user.id, "agency.update", "agency", agency.id, { via: "strength", fields: Object.keys(patch) });
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}
