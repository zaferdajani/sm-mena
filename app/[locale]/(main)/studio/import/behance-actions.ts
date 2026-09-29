"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAgency } from "@/lib/auth/guards";
import { audit, updateAgency } from "@/lib/data/agencies";
import { listClients, saveClient } from "@/lib/data/portfolio-clients";
import { canUse } from "@/lib/feature-gate";
import { INDUSTRIES, PLATFORMS } from "@/lib/labels";
import { canCreatePost, entitlementsFor } from "@/lib/monetization/entitlements";
import { resolveServices } from "@/lib/services/tags";
import { rateLimit } from "@/lib/rate-limit";
import { isServiceKey } from "@/lib/taxonomy";
import { normalizeForSearch } from "@/lib/text";
import { isCountryCode } from "@/lib/countries";
import { BehanceError, loadBehancePortfolio } from "@/lib/behance";
import { BehanceImportError, fetchBehanceImages, importBehanceAvatar, importBehanceProject } from "@/lib/behance/import";
import { HANDOFF_MAX_BYTES, portfolioFromHandoff } from "@/lib/behance/handoff";
import { assertBehanceUrl } from "@/lib/behance/fetch";
import { BEHANCE_LIMITS, type BehancePortfolio } from "@/lib/behance/types";

// Studio → Import from Behance (docs/47-behance-import.md). Reading proposes;
// the provider reviews; each kept project is published one by one and the
// profile details it accepts are saved. Nothing is written by reading.

export type BehancePreviewState = { portfolio?: BehancePortfolio; error?: "unavailable" | "invalid" | "notFound" | "unreachable" | "busy" | "empty" | "rateLimited" };

export async function previewBehanceAction(input: unknown): Promise<BehancePreviewState> {
  const { agency } = await requireAgency();
  if (!(await canUse("portfolio_import"))) return { error: "unavailable" };
  const raw = typeof input === "string" ? input.trim().slice(0, 300) : "";
  if (!raw) return { error: "invalid" };
  // Each read is a handful of page fetches from Behance: a few an hour per agency is plenty.
  if (!rateLimit(`behance-import:${agency.id}`, 12, 60 * 60 * 1000)) return { error: "rateLimited" };
  try {
    const portfolio = await loadBehancePortfolio(raw, {
      handle: agency.handle,
      website: agency.website,
      instagram: agency.instagram,
      about: agency.about,
      services: agency.services,
      country: isCountryCode(agency.country) ? agency.country : "jo",
    });
    await audit(null, "behance_import.read", "agency", agency.id, { projects: portfolio.drafts.length, source: portfolio.source, ownership: portfolio.ownership });
    return { portfolio };
  } catch (e) {
    return { error: e instanceof BehanceError ? e.code : "unreachable" };
  }
}

const handoffSchema = z.object({
  url: z.string().url().max(500),
  blobs: z.array(z.string()).max(40),
  meta: z.object({ title: z.string().max(500).optional(), image: z.string().max(1000).optional(), description: z.string().max(5000).optional() }),
});

/** The browser path: the bookmarklet's page data becomes one draft, reviewed like any other. */
export async function previewBehanceHandoffAction(input: unknown): Promise<BehancePreviewState> {
  const { agency } = await requireAgency();
  if (!(await canUse("portfolio_import"))) return { error: "unavailable" };
  const parsed = handoffSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const h = parsed.data;
  if (h.blobs.reduce((n, b) => n + b.length, 0) > HANDOFF_MAX_BYTES) return { error: "invalid" };
  try {
    assertBehanceUrl(h.url);
  } catch {
    return { error: "invalid" };
  }
  if (!rateLimit(`behance-import:${agency.id}`, 12, 60 * 60 * 1000)) return { error: "rateLimited" };
  const portfolio = portfolioFromHandoff(h, {
    handle: agency.handle,
    website: agency.website,
    instagram: agency.instagram,
    about: agency.about,
    services: agency.services,
    country: isCountryCode(agency.country) ? agency.country : "jo",
  });
  if (!portfolio) return { error: "empty" };
  await audit(null, "behance_import.read", "agency", agency.id, { projects: 1, source: "handoff", ownership: portfolio.ownership });
  return { portfolio };
}

const projectSchema = z.object({
  projectUrl: z.string().url().max(500),
  images: z.array(z.string().url().max(1000)).min(1).max(BEHANCE_LIMITS.imagesPerProject),
  publishedAt: z.string().datetime().nullable().optional(),
  /** From the first-run setup: stage the project privately in the wizard instead of publishing. */
  setup: z.boolean().optional(),
  caption: z.string().max(BEHANCE_LIMITS.caption),
  services: z.array(z.string().max(60)).max(6),
  platforms: z.array(z.string().max(30)).max(12),
  industry: z.string().max(60).nullable(),
  client: z.string().max(80).nullable(),
});

export type BehanceImportState = { ok?: boolean; postId?: string; staged?: boolean; error?: string };

async function clientIdFor(agencyId: string, name: string, industry: string | null) {
  const wanted = normalizeForSearch(name);
  const existing = (await listClients(agencyId)).find((c) => normalizeForSearch(c.name) === wanted);
  if (existing) return existing.id;
  const saved = await saveClient(agencyId, null, { name, industry, country: null, description: "", links: [] });
  return "ok" in saved ? saved.id : null;
}

/** Publishes one reviewed Behance project as a post. */
export async function importBehanceProjectAction(input: unknown): Promise<BehanceImportState> {
  const { agency } = await requireAgency();
  if (!(await canUse("portfolio_import"))) return { error: "unavailable" };
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;
  const services = [...new Set(d.services)].filter(isServiceKey);
  if (!services.length) return { error: "noServices" };
  if (!canCreatePost(entitlementsFor(agency), agency.postCount)) return { error: "limit" };
  const industry = d.industry && (INDUSTRIES as readonly string[]).includes(d.industry) ? d.industry : null;
  const clientName = (d.client ?? "").trim().slice(0, 80);
  if (d.setup) {
    // The wizard reviews and saves it (docs/53): nothing is published here, and the client name is only a suggestion.
    try {
      const { processed, sourceUrl } = await fetchBehanceImages({ projectUrl: d.projectUrl, images: d.images });
      const { addDraftMedia } = await import("@/lib/data/onboarding");
      const staged = await addDraftMedia(agency.id, processed, { source: "behance", sourceUrl, suggestedClient: clientName.length >= 2 ? clientName : null, title: d.caption.trim().split("\n")[0].slice(0, 120), services, platforms: [...new Set(d.platforms)].filter((p) => (PLATFORMS as readonly string[]).includes(p)), step: 3 });
      if ("error" in staged) return { error: staged.error === "too_many" ? "tooMany" : "generic" };
      await audit(null, "behance_import.stage", "agency", agency.id, { source: d.projectUrl, images: d.images.length });
      return { ok: true, staged: true };
    } catch (e) {
      return { error: e instanceof BehanceImportError ? e.code : "generic" };
    }
  }
  try {
    const post = await importBehanceProject(agency.id, {
      projectUrl: d.projectUrl,
      images: d.images,
      publishedAt: d.publishedAt ? new Date(d.publishedAt) : null,
      caption: d.caption.trim().slice(0, BEHANCE_LIMITS.caption),
      services,
      platforms: [...new Set(d.platforms)].filter((p) => (PLATFORMS as readonly string[]).includes(p)),
      industry,
      result: null,
      clientId: clientName.length >= 2 ? await clientIdFor(agency.id, clientName, industry) : null,
    });
    await audit(null, "behance_import.post", "post", post.id, { source: d.projectUrl, images: d.images.length });
    revalidatePath("/[locale]", "layout");
    return { ok: true, postId: post.id };
  } catch (e) {
    return { error: e instanceof BehanceImportError ? e.code : "generic" };
  }
}

const profileSchema = z.object({
  about: z.string().max(2000).nullable(),
  website: z.string().max(200).nullable(),
  avatar: z.string().url().max(1000).nullable(),
  services: z.array(z.string().max(60)).max(8),
});

/** Saves the profile details the provider accepted from Behance: introduction, website, services and picture. */
export async function applyBehanceProfileAction(input: unknown): Promise<{ ok?: boolean; error?: string }> {
  const { user, agency } = await requireAgency();
  if (!(await canUse("portfolio_import"))) return { error: "unavailable" };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { about, website, avatar, services } = parsed.data;
  const picked = services.length ? await resolveServices(agency.id, services, []) : null;
  const patch = {
    ...(about?.trim() ? { about: about.trim() } : {}),
    ...(website?.trim() ? { website: website.trim() } : {}),
    ...(picked?.services.length ? { services: [...new Set([...agency.services, ...picked.services])] } : {}),
  };
  if (Object.keys(patch).length) await updateAgency(agency.id, patch);
  let picture = false;
  if (avatar) {
    try {
      await importBehanceAvatar({ id: agency.id, avatarKey: agency.avatarKey }, avatar);
      picture = true;
    } catch {
      // keep the current picture
    }
  }
  await audit(user.id, "behance_import.apply", "agency", agency.id, { about: Boolean(about?.trim()), website: Boolean(website?.trim()), services: picked?.services.length ?? 0, avatar: picture });
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}
