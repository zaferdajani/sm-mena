"use server";

import { canUse } from "@/lib/feature-gate";
import { demoMode } from "@/lib/demo-mode";
import { withCountry } from "@/lib/matching/scope";
import { revalidatePath } from "next/cache";
import { countryOfCity } from "@/lib/countries";
import { currentCountry } from "@/lib/country-choice";
import { z } from "zod";
import { closeRequest, createProjectRequest, getRequestByToken, getRequestForVisitor, INVITED, setProposalStatus } from "@/lib/data/requests";
import { CITIES, PLATFORMS } from "@/lib/labels";
import { findMatches } from "@/lib/matching";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { isServiceKey } from "@/lib/taxonomy";
import { normalizePhone } from "@/lib/text";
import { getVisitorId } from "@/lib/visitor";

export type RequestState = { token?: string; requestId?: string; invited?: number; error?: string } | undefined;

const optionalInt = z.union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000)]).optional().transform((v) => (v === "" || v === undefined ? null : v));

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  business: z.string().trim().max(120).optional(),
  city: z.union([z.literal(""), z.enum(CITIES)]).optional(),
  budgetMin: optionalInt,
  budgetMax: optionalInt,
  timeline: z.union([z.literal(""), z.enum(["asap", "this_month", "within_3_months"])]).optional(),
  description: z.string().trim().min(10).max(3000),
  brands: z.string().trim().max(300).optional(),
  source: z.enum(["form", "ai"]).default("form"),
});

export async function createRequestAction(_: RequestState, formData: FormData): Promise<RequestState> {
  // Switched off or coming soon (Admin → Features).
  if (!(await canUse("quote_requests"))) return { error: "unavailable" };
  if (formData.get("consent") !== "on") return { error: "consent" };
  const services = [...new Set(formData.getAll("services").map(String))].filter(isServiceKey).slice(0, 6);
  const platforms = [...new Set(formData.getAll("platforms").map(String))].filter((p) => (PLATFORMS as readonly string[]).includes(p));
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !services.length) return { error: "required" };
  const d = parsed.data;
  const phone = normalizePhone(d.phone);
  if (!/^\+?\d{8,15}$/.test(phone)) return { error: "phone" };
  const visitorId = await getVisitorId({ create: true });
  const ip = await clientIp();
  if (!rateLimit(`request:${ip}`, 5, 24 * 3600 * 1000) || !rateLimit(`request:${visitorId}`, 3, 24 * 3600 * 1000)) return { error: "rateLimited" };

  const city = d.city || null;
  const budgetMax = d.budgetMax && d.budgetMin && d.budgetMax < d.budgetMin ? d.budgetMin : d.budgetMax;
  const fullService = formData.get("fullService") === "on";
  const country = countryOfCity(city) ?? (await currentCountry());
  // In the demo view a request goes to sample agencies only (and is stored as a demo request);
  // otherwise only real agencies are matched (docs/31).
  const includeDemo = await demoMode();
  const matches = await withCountry(country, () => findMatches({ services, city, budgetMaxJod: budgetMax, platforms, fullService, country }, 8), includeDemo);
  const { token, request } = await createProjectRequest(
    {
      clientName: d.name,
      phone,
      businessName: d.business || null,
      services,
      platforms,
      city,
      country,
      budgetMinJod: d.budgetMin,
      budgetMaxJod: budgetMax,
      timeline: d.timeline || null,
      description: d.description,
      fullService,
      brands: d.brands || null,
      source: includeDemo ? "demo" : d.source,
      visitorId,
    },
    matches.map((m) => ({ agencyId: m.id, score: m.score })),
  );
  if (process.env.NODE_ENV !== "test") console.info(`[notify:mock] project request ${request.id} → ${matches.slice(0, INVITED).map((m) => m.handle).join(", ")}`);
  return { token, requestId: request.id, invited: Math.min(matches.length, INVITED) };
}

/** Client access by private token or by the device that created the request. */
async function authorize(access: { token?: string; requestId?: string }) {
  if (access.token) return getRequestByToken(access.token);
  if (access.requestId) return getRequestForVisitor(access.requestId, await getVisitorId());
  return null;
}

export async function proposalDecisionAction(access: { token?: string; requestId?: string }, proposalId: string, status: "shortlisted" | "accepted" | "declined" | "sent") {
  const data = await authorize(access);
  if (!data) throw new Error("forbidden");
  await setProposalStatus(data.request.id, z.string().uuid().parse(proposalId), z.enum(["shortlisted", "accepted", "declined", "sent"]).parse(status));
  revalidatePath("/[locale]", "layout");
}

export async function closeRequestAction(access: { token?: string; requestId?: string }) {
  const data = await authorize(access);
  if (!data) throw new Error("forbidden");
  await closeRequest(data.request.id);
  revalidatePath("/[locale]", "layout");
}
