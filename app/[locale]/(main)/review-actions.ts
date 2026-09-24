"use server";

import { z } from "zod";
import { submitInquiryReview, submitInviteReview } from "@/lib/data/reviews";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { isServiceKey } from "@/lib/taxonomy";
import { getVisitorId } from "@/lib/visitor";

export type ReviewState = { ok?: boolean; error?: string } | undefined;

const score = z.coerce.number().int().min(1).max(5);
const optionalScore = z.union([z.literal(""), score]).optional().transform((v) => (v === "" || v === undefined ? null : v));

const schema = z.object({
  rating: score,
  quality: optionalScore,
  communication: optionalScore,
  value: optionalScore,
  timeliness: optionalScore,
  results: optionalScore,
  body: z.string().trim().min(20).max(2000),
  name: z.string().trim().min(2).max(60),
  business: z.string().trim().max(100).optional(),
  service: z.string().optional(),
  consent: z.literal("on"),
});

async function parse(formData: FormData): Promise<{ error: string } | { input: Parameters<typeof submitInviteReview>[1] }> {
  const raw = Object.fromEntries(formData);
  if (!raw.rating) return { error: "rating" };
  if (raw.consent !== "on") return { error: "consent" };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0]);
    return { error: field === "body" ? "body" : field === "name" ? "name" : field === "rating" ? "rating" : "generic" };
  }
  const d = parsed.data;
  const ip = await clientIp();
  if (!rateLimit(`review:${ip}`, 10, 3600 * 1000)) return { error: "rateLimited" };
  return {
    input: {
      rating: d.rating,
      quality: d.quality,
      communication: d.communication,
      value: d.value,
      timeliness: d.timeliness,
      results: d.results,
      body: d.body,
      reviewerName: d.name.split(/\s+/)[0], // first name only, for privacy
      reviewerBusiness: d.business || null,
      service: d.service && isServiceKey(d.service) ? d.service : null,
      visitorId: await getVisitorId({ create: true }),
    },
  };
}

export async function inviteReviewAction(_: ReviewState, formData: FormData): Promise<ReviewState> {
  const token = String(formData.get("token") ?? "");
  const parsed = await parse(formData);
  if ("error" in parsed) return { error: parsed.error };
  const review = await submitInviteReview(token, parsed.input);
  return review ? { ok: true } : { error: "generic" };
}

export async function inquiryReviewAction(_: ReviewState, formData: FormData): Promise<ReviewState> {
  const agencyId = z.string().uuid().safeParse(formData.get("agencyId"));
  if (!agencyId.success) return { error: "generic" };
  const parsed = await parse(formData);
  if ("error" in parsed) return { error: parsed.error };
  const review = await submitInquiryReview(agencyId.data, parsed.input);
  return review ? { ok: true } : { error: "generic" };
}
