"use server";

import { z } from "zod";
import {
  recordContact,
  toggleFollow,
  toggleLike,
  toggleSave,
} from "@/lib/data/interactions";
import { feedPage, type FeedPage } from "@/lib/feed";
import { recordPromotionClick } from "@/lib/monetization/promotions";
import { rateLimit } from "@/lib/rate-limit";
import { getVisitorId } from "@/lib/visitor";
import { createInquiry, createReport } from "@/lib/data/interactions";
import { getDb } from "@/lib/db";
import { agencies as agenciesTable } from "@/lib/db/schema";
import { notifyNewInquiry } from "@/lib/notify";
import { clientIp } from "@/lib/request";
import { normalizePhone } from "@/lib/text";
import { eq } from "drizzle-orm";

const uuid = z.string().uuid();

const filtersSchema = z
  .object({
    q: z.string().max(80).optional(),
    service: z.string().max(40).optional(),
    city: z.string().max(40).optional(),
    platform: z.string().max(40).optional(),
    industry: z.string().max(40).optional(),
    maxPrice: z.number().int().positive().optional(),
    verified: z.boolean().optional(),
    agencyId: uuid.optional(),
  })
  .strict();

export async function loadMorePosts(
  rawFilters: unknown,
  cursor: string,
  placement: "feed" | "explore" | null,
): Promise<FeedPage> {
  const filters = filtersSchema.parse(rawFilters ?? {});
  const visitorId = await getVisitorId();
  return feedPage(filters, z.string().max(200).parse(cursor), visitorId, { placement });
}

async function visitorOrThrow(action: string) {
  const visitorId = await getVisitorId({ create: true });
  if (!visitorId || !rateLimit(`${action}:${visitorId}`, 120, 60 * 1000)) throw new Error("rate_limited");
  return visitorId;
}

export async function likePost(postId: string) {
  return toggleLike(uuid.parse(postId), await visitorOrThrow("like"));
}

export async function savePost(postId: string) {
  return toggleSave(uuid.parse(postId), await visitorOrThrow("save"));
}

export async function followAgency(agencyId: string) {
  return toggleFollow(uuid.parse(agencyId), await visitorOrThrow("follow"));
}

const channel = z.enum(["whatsapp", "phone", "email", "website", "instagram"]);

export async function trackContact(agencyId: string, contactChannel: string, postId?: string | null, promotionId?: string | null) {
  const visitorId = await getVisitorId({ create: true });
  if (visitorId && !rateLimit(`contact:${visitorId}`, 60, 60 * 1000)) return;
  await recordContact(uuid.parse(agencyId), channel.parse(contactChannel), postId ? uuid.parse(postId) : null, visitorId);
  if (promotionId) await recordPromotionClick(uuid.parse(promotionId), visitorId);
}

export async function trackPromotionClick(promotionId: string) {
  const visitorId = await getVisitorId();
  await recordPromotionClick(uuid.parse(promotionId), visitorId);
}

// ---------------------------------------------------------------------------
// Leads and reports
// ---------------------------------------------------------------------------

export type InquiryState = { ok?: boolean; error?: string } | undefined;

const inquirySchema = z.object({
  agencyId: uuid,
  postId: uuid.optional().or(z.literal("")),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  business: z.string().trim().max(120).optional(),
  service: z.string().trim().max(40).optional(),
  message: z.string().trim().min(5).max(2000),
  consent: z.literal("on"),
});

export async function sendInquiry(_: InquiryState, formData: FormData): Promise<InquiryState> {
  const raw = Object.fromEntries(formData);
  if (raw.consent !== "on") return { error: "consent" };
  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) return { error: "required" };
  const phone = normalizePhone(parsed.data.phone);
  if (!/^\+?\d{8,15}$/.test(phone)) return { error: "phone" };
  const visitorId = await getVisitorId({ create: true });
  const ip = await clientIp();
  if (!rateLimit(`inquiry:${ip}`, 5, 60 * 60 * 1000) || !rateLimit(`inquiry:${visitorId}:${parsed.data.agencyId}`, 2, 24 * 3600 * 1000)) {
    return { error: "rateLimited" };
  }
  const db = await getDb();
  const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, parsed.data.agencyId));
  if (!agency || agency.status !== "active") return { error: "generic" };
  const inquiry = await createInquiry({
    agencyId: agency.id,
    postId: parsed.data.postId || null,
    name: parsed.data.name,
    phone,
    businessName: parsed.data.business || null,
    service: parsed.data.service || null,
    message: parsed.data.message,
    visitorId,
  });
  await notifyNewInquiry(agency, inquiry).catch(() => {});
  return { ok: true };
}

export type ReportState = { ok?: boolean; error?: string } | undefined;

export async function reportPost(_: ReportState, formData: FormData): Promise<ReportState> {
  const parsed = z
    .object({
      postId: uuid,
      reason: z.enum(["spam", "stolen_work", "misleading", "inappropriate", "other"]),
      details: z.string().trim().max(1000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "generic" };
  const visitorId = await getVisitorId({ create: true });
  if (!rateLimit(`report:${visitorId}`, 10, 24 * 3600 * 1000)) return { error: "generic" };
  await createReport({ postId: parsed.data.postId, reason: parsed.data.reason, details: parsed.data.details ?? "", visitorId });
  return { ok: true };
}
