"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { audit, getAgencyByHandle } from "@/lib/data/agencies";
import { createPromotion, removeDemoData, resolveReport, setAgencyFlags, setPostStatus, setPromotionStatus } from "@/lib/data/admin";
import { getDb } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { setReviewStatus } from "@/lib/data/reviews";
import { CITIES } from "@/lib/labels";
import { isServiceKey } from "@/lib/taxonomy";

const uuid = z.string().uuid();
const refresh = () => revalidatePath("/[locale]", "layout");

export async function setVerifiedAction(agencyId: string, verified: boolean) {
  const admin = await requireAdmin();
  await setAgencyFlags(uuid.parse(agencyId), { isVerified: verified });
  await audit(admin.id, verified ? "agency.verify" : "agency.unverify", "agency", agencyId);
  refresh();
}

export async function setStatusAction(agencyId: string, status: "active" | "suspended") {
  const admin = await requireAdmin();
  await setAgencyFlags(uuid.parse(agencyId), { status: z.enum(["active", "suspended"]).parse(status) });
  await audit(admin.id, `agency.${status}`, "agency", agencyId);
  refresh();
}

export async function setPlanAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = z
    .object({ agencyId: uuid, plan: z.enum(["free", "pro", "business"]), until: z.union([z.literal(""), z.string().date()]) })
    .parse(Object.fromEntries(formData));
  await setAgencyFlags(data.agencyId, { plan: data.plan, planExpiresAt: data.until ? new Date(`${data.until}T23:59:59Z`) : null });
  await audit(admin.id, "agency.plan", "agency", data.agencyId, { plan: data.plan, until: data.until });
  refresh();
}

export async function removeDemoAction() {
  const admin = await requireAdmin();
  const count = await removeDemoData();
  await audit(admin.id, "demo.remove", "agency", undefined, { count });
  refresh();
  return count;
}

export async function resolveReportAction(reportId: string, decision: "hide" | "dismiss") {
  const admin = await requireAdmin();
  await resolveReport(uuid.parse(reportId), admin.id, z.enum(["hide", "dismiss"]).parse(decision));
  await audit(admin.id, `report.${decision}`, "report", reportId);
  refresh();
}

export async function setPostStatusAction(postId: string, status: "published" | "hidden") {
  const admin = await requireAdmin();
  await setPostStatus(uuid.parse(postId), z.enum(["published", "hidden"]).parse(status));
  await audit(admin.id, `post.${status}`, "post", postId);
  refresh();
}

export type PromoState = { ok?: boolean; error?: string } | undefined;

export async function createPromotionAction(_: PromoState, formData: FormData): Promise<PromoState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      handle: z.string().trim().min(3),
      postId: z.union([z.literal(""), uuid]),
      placement: z.enum(["feed", "strip", "explore"]),
      service: z.string().optional(),
      city: z.string().optional(),
      startsAt: z.string().date(),
      endsAt: z.string().date(),
      note: z.string().max(200).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "generic" };
  const d = parsed.data;
  const agency = await getAgencyByHandle(d.handle.replace(/^@/, ""));
  if (!agency) return { error: "agency" };
  if (d.placement !== "strip" && !d.postId) return { error: "post" };
  if (d.postId) {
    const db = await getDb();
    const [post] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, d.postId), eq(posts.agencyId, agency.id)));
    if (!post) return { error: "post" };
  }
  const startsAt = new Date(`${d.startsAt}T00:00:00Z`);
  const endsAt = new Date(`${d.endsAt}T23:59:59Z`);
  if (endsAt <= startsAt) return { error: "dates" };
  const promo = await createPromotion({
    agencyId: agency.id,
    postId: d.postId || null,
    placement: d.placement,
    service: d.service && isServiceKey(d.service) ? d.service : null,
    city: d.city && (CITIES as readonly string[]).includes(d.city) ? d.city : null,
    startsAt,
    endsAt,
    note: d.note ?? "",
    createdBy: admin.id,
  });
  await audit(admin.id, "promotion.create", "promotion", promo.id);
  refresh();
  return { ok: true };
}

export async function setPromotionStatusAction(id: string, status: "active" | "paused" | "ended") {
  const admin = await requireAdmin();
  await setPromotionStatus(uuid.parse(id), z.enum(["active", "paused", "ended"]).parse(status));
  await audit(admin.id, `promotion.${status}`, "promotion", id);
  refresh();
}

export async function setReviewStatusAction(reviewId: string, status: "published" | "hidden") {
  const admin = await requireAdmin();
  await setReviewStatus(uuid.parse(reviewId), z.enum(["published", "hidden"]).parse(status));
  await audit(admin.id, `review.${status}`, "review", reviewId);
  refresh();
}
