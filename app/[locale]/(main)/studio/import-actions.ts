"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireAgency } from "@/lib/auth/guards";
import { audit, updateAgency } from "@/lib/data/agencies";
import { listClients, saveClient, setClientLogo } from "@/lib/data/portfolio-clients";
import { createPost } from "@/lib/data/posts";
import { canUse } from "@/lib/feature-gate";
import { ImageError, MAX_IMAGES_PER_POST, newAvatarKey, newClientLogoKey, processAvatar } from "@/lib/images";
import { resolveServices } from "@/lib/services/tags";
import { storage } from "@/lib/storage";
import { INDUSTRIES, PLATFORMS } from "@/lib/labels";
import { canCreatePost, entitlementsFor } from "@/lib/monetization/entitlements";
import { analyzePortfolio } from "@/lib/portfolio-import";
import { IMPORT_LIMITS, type ImportPlan } from "@/lib/portfolio-import/types";
import { rateLimit } from "@/lib/rate-limit";
import { isServiceKey } from "@/lib/taxonomy";
import { normalizeForSearch } from "@/lib/text";
import { isCountryCode } from "@/lib/countries";

// Studio → Import a PDF portfolio (docs/36-portfolio-import.md). Nothing is
// published by reading: the agency reviews every draft, then publishes the
// ones it keeps one by one (importPostAction) and the profile details it
// accepts (applyProfileImportAction).

const pagesSchema = z
  .array(
    z.object({
      index: z.number().int().min(0).max(IMPORT_LIMITS.pages - 1),
      text: z.string().max(IMPORT_LIMITS.textPerPage * 2).transform((t) => t.slice(0, IMPORT_LIMITS.textPerPage)),
      layout: z.enum(["gallery", "logos", "single", "plain"]).optional(),
      crops: z.number().int().min(0).max(IMPORT_LIMITS.cropsPerPage).optional(),
      cropTexts: z.array(z.string().max(80)).max(IMPORT_LIMITS.cropsPerPage).optional(),
      image: z
        .string()
        .max(Math.ceil(IMPORT_LIMITS.thumbBytes * 1.4))
        .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/)
        .nullable()
        .optional(),
    }),
  )
  .min(1)
  .max(IMPORT_LIMITS.pages);

export type AnalyzeState = { plan?: ImportPlan; error?: "unavailable" | "invalid" | "rateLimited" | "generic" };

/** Reads the pages (text plus a small image each) and proposes drafts. */
export async function analyzePortfolioAction(pages: unknown): Promise<AnalyzeState> {
  const { agency } = await requireAgency();
  if (!(await canUse("portfolio_import"))) return { error: "unavailable" };
  const parsed = pagesSchema.safeParse(pages);
  if (!parsed.success) return { error: "invalid" };
  // Reading may call the AI: a few imports an hour per agency is plenty.
  if (!rateLimit(`portfolio-import:${agency.id}`, 6, 60 * 60 * 1000)) return { error: "rateLimited" };
  try {
    const country = isCountryCode(agency.country) ? agency.country : "jo";
    const plan = await analyzePortfolio(parsed.data, { name: agency.name, services: agency.services, country }, await getLocale());
    await audit(null, "portfolio_import.read", "agency", agency.id, { pages: parsed.data.length, mode: plan.mode, drafts: plan.drafts.length });
    return { plan };
  } catch {
    return { error: "generic" };
  }
}

export type ImportPostState = { ok?: boolean; postId?: string; error?: string };

/** Finds the agency's client by name, or adds it (so imported posts are tagged with their client). */
async function clientIdFor(agencyId: string, name: string, industry: string | null) {
  const wanted = normalizeForSearch(name);
  const existing = (await listClients(agencyId)).find((c) => normalizeForSearch(c.name) === wanted);
  if (existing) return existing.id;
  const saved = await saveClient(agencyId, null, { name, industry, country: null, description: "", links: [] });
  return "ok" in saved ? saved.id : null;
}

/** Publishes one reviewed draft as a post (images already compressed in the browser). */
export async function importPostAction(formData: FormData): Promise<ImportPostState> {
  const { agency } = await requireAgency();
  if (!(await canUse("portfolio_import"))) return { error: "unavailable" };
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "noImages" };
  if (files.length > MAX_IMAGES_PER_POST) return { error: "tooMany" };
  const services = [...new Set(formData.getAll("services").map(String))].filter(isServiceKey);
  if (!services.length) return { error: "noServices" };
  if (!canCreatePost(entitlementsFor(agency), agency.postCount)) return { error: "limit" };
  const industryRaw = String(formData.get("industry") ?? "");
  const industry = (INDUSTRIES as readonly string[]).includes(industryRaw) ? industryRaw : null;
  const clientName = String(formData.get("client") ?? "").trim().slice(0, 80);
  const fields = {
    caption: String(formData.get("caption") ?? "").trim().slice(0, 2200),
    services,
    platforms: [...new Set(formData.getAll("platforms").map(String))].filter((p) => (PLATFORMS as readonly string[]).includes(p)),
    industry,
    result: String(formData.get("result") ?? "").trim().slice(0, 80) || null,
    clientId: clientName.length >= 2 ? await clientIdFor(agency.id, clientName, industry) : null,
  };
  try {
    const buffers = await Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer())));
    const post = await createPost(agency.id, fields, buffers);
    return { ok: true, postId: post.id };
  } catch (error) {
    return { error: error instanceof ImageError ? error.code : "generic" };
  }
}

const profileSchema = z.object({
  about: z.string().max(2000).nullable(),
  strengths: z.array(z.string().trim().min(1).max(80)).max(6),
  services: z.array(z.string().max(60)).max(8),
  // `logo`: a file `clientLogo:{index}` in the form data holds the account's logo.
  clients: z.array(z.object({ name: z.string().trim().min(2).max(80), industry: z.string().nullable(), logo: z.boolean().optional() })).max(30),
});

/**
 * Saves the profile details the agency accepted: its introduction, strengths,
 * services the portfolio names, clients, and the logo from the cover as its
 * page picture. `formData` carries `data` (JSON) and optionally `avatar`.
 */
export async function applyProfileImportAction(formData: FormData): Promise<{ ok?: boolean; clients?: number; services?: number; avatar?: boolean; error?: string }> {
  const { user, agency } = await requireAgency();
  if (!(await canUse("portfolio_import"))) return { error: "unavailable" };
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("data") ?? ""));
  } catch {
    return { error: "invalid" };
  }
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { error: "invalid" };
  const { about, strengths, services, clients } = parsed.data;

  let avatarKey: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    try {
      avatarKey = newAvatarKey(agency.id);
      await storage().put(avatarKey, await processAvatar(Buffer.from(await avatar.arrayBuffer())), "image/webp");
    } catch {
      return { error: "avatar" };
    }
  }
  // Known catalog tags only; their core parents come along (docs/30).
  const picked = services.length ? await resolveServices(agency.id, services, []) : null;
  const patch = {
    ...(about?.trim() ? { about: about.trim() } : {}),
    ...(strengths.length ? { strengths: [...new Set([...agency.strengths, ...strengths])].slice(0, 8) } : {}),
    ...(picked?.services.length ? { services: [...new Set([...agency.services, ...picked.services])] } : {}),
    ...(avatarKey ? { avatarKey } : {}),
  };
  if (Object.keys(patch).length) {
    await updateAgency(agency.id, patch);
    if (avatarKey && agency.avatarKey) await storage().remove([agency.avatarKey]).catch(() => {});
  }
  let added = 0;
  for (const [i, c] of clients.entries()) {
    const industry = c.industry && (INDUSTRIES as readonly string[]).includes(c.industry) ? c.industry : null;
    const id = await clientIdFor(agency.id, c.name, industry);
    if (!id) continue;
    added++;
    // The logo cut out of the PDF becomes the account's logo (a missing or unreadable one is simply skipped).
    const logo = c.logo ? formData.get(`clientLogo:${i}`) : null;
    if (logo instanceof File && logo.size > 0) {
      try {
        const key = newClientLogoKey(agency.id);
        await storage().put(key, await processAvatar(Buffer.from(await logo.arrayBuffer())), "image/webp");
        const old = await setClientLogo(agency.id, id, key);
        if (old) await storage().remove([old]).catch(() => {});
      } catch {
        // keep the account without a logo
      }
    }
  }
  await audit(user.id, "portfolio_import.apply", "agency", agency.id, { clients: added, services: picked?.services.length ?? 0, avatar: Boolean(avatarKey), about: Boolean(about?.trim()) });
  revalidatePath("/[locale]", "layout");
  return { ok: true, clients: added, services: picked?.services.length ?? 0, avatar: Boolean(avatarKey) };
}
