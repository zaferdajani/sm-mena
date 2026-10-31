"use server";

import { z } from "zod";
import { requireStaff } from "@/lib/auth/guards";
import { audit } from "@/lib/data/agencies";
import { eq, sql } from "drizzle-orm";
import { addNotifications } from "@/lib/data/notifications";
import { getDb } from "@/lib/db";
import { agencies, serviceTags } from "@/lib/db/schema";
import { reviewTag } from "@/lib/services/tags";

export type ServiceReviewState = { ok?: string; error?: string } | undefined;

const decision = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    nameAr: z.string().trim().min(2).max(80),
    nameEn: z.string().trim().max(80),
    group: z.string().trim().max(40),
    parent: z.string().trim().max(40),
    roles: z.array(z.string().max(40)).max(6),
    aliases: z.string().max(400),
  }),
  z.object({ action: z.literal("merge"), into: z.string().trim().min(1).max(60) }),
  z.object({ action: z.literal("reject") }),
]);

/** Admin → Services: approve a typed service as a tag, merge it into one, or reject it. */
export async function reviewServiceAction(_: ServiceReviewState, formData: FormData): Promise<ServiceReviewState> {
  const admin = await requireStaff("agencies.moderate");
  const id = z.coerce.number().int().positive().safeParse(formData.get("tagId"));
  const parsed = decision.safeParse({ ...Object.fromEntries(formData), roles: formData.getAll("roles").map(String) });
  if (!id.success || !parsed.success) return { error: "invalid" };
  const d = parsed.data;
  // Who proposed it, read before the decision moves them off the pending list: they are told the outcome.
  const db = await getDb();
  const [tag] = await db.select({ text: serviceTags.proposedText }).from(serviceTags).where(eq(serviceTags.id, id.data));
  const proposers = await db.select({ id: agencies.id }).from(agencies).where(sql`${id.data} = any(${agencies.pendingServices})`);
  const result = await reviewTag(
    id.data,
    d.action === "approve"
      ? { ...d, nameEn: d.nameEn || d.nameAr, parent: d.parent || null, aliases: d.aliases.split(/[,،\n]/).map((a) => a.trim()).filter(Boolean) }
      : d,
    admin.id,
  );
  if ("error" in result) return { error: result.error };
  // The service as the provider typed it, so they recognise it in their own language.
  const service = tag?.text ?? "";
  await addNotifications(proposers.map((p) => ({ agencyId: p.id, kind: d.action === "reject" ? "service_rejected" as const : "service_approved" as const, href: "/studio/profile", params: { service } })));
  await audit(admin.id, `service.${d.action}`, "service_tag", String(id.data), { key: result.key ?? null, agencies: result.agencies });
  // No page refresh: the card stays to show the result; agency pages read tags fresh.
  return { ok: d.action };
}
