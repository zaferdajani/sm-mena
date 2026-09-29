"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireAgency } from "@/lib/auth/guards";
import {
  addClientOnce,
  addSetupMedia,
  getSetup,
  openSetup,
  orderSetupMedia,
  ownedClientId,
  patchProfile,
  publishSetup,
  removeSetupMedia,
  restartSetup,
  SETUP_STEPS,
  writeSetup,
  type SetupError,
  type SetupMediaView,
  type SetupView,
} from "@/lib/data/portfolio-setup";
import { getItemForAgency, stageItem } from "@/lib/data/social";
import { contentLang } from "@/lib/content-lang";
import { assertBehanceUrl } from "@/lib/behance/fetch";
import { BEHANCE_LIMITS } from "@/lib/behance/types";
import { canUse } from "@/lib/feature-gate";
import { MAX_IMAGES_PER_POST } from "@/lib/images";
import { canCreatePost, entitlementsFor } from "@/lib/monetization/entitlements";
import { rateLimit } from "@/lib/rate-limit";
import { resolveServices } from "@/lib/services/tags";
import { isServiceKey } from "@/lib/taxonomy";

// First-run portfolio setup (docs/53). Each action re-reads the signed-in
// agency, checks ownership of every id it is given, and saves only on the
// draft version the browser last saw.

export type SetupResult = { view?: SetupView; media?: SetupMediaView[]; error?: SetupError | "avatar" | "limit" | "unavailable"; postId?: string };

const version = z.coerce.number().int().min(0);
const uuid = z.string().uuid();

const done = (view: SetupView | { error: SetupError }): SetupResult => ("error" in view ? { error: view.error } : { view });

/** Back, Edit or "go to step n" (never past what the draft allows; the page checks what each step needs). */
export async function goToStepAction(v: number, step: number): Promise<SetupResult> {
  const { agency } = await requireAgency();
  return done(await writeSetup(agency.id, version.parse(v), { step: z.number().int().min(1).max(SETUP_STEPS).parse(step) }));
}

export async function pauseSetupAction(v: number): Promise<SetupResult> {
  const { agency } = await requireAgency();
  return done(await writeSetup(agency.id, version.parse(v), { status: "paused" }));
}

const profileSchema = z.object({
  version,
  name: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(500),
});

/** Step 1: saves the name, introduction, services and picture that changed; nothing else on the profile is touched. */
export async function saveProfileStepAction(formData: FormData): Promise<SetupResult> {
  const { user, agency } = await requireAgency();
  const parsed = profileSchema.safeParse({ version: formData.get("version"), name: formData.get("name"), bio: formData.get("bio") ?? "" });
  if (!parsed.success) return { error: "invalid" };
  const currentDraft = await getSetup(agency.id);
  if (!currentDraft || currentDraft.version !== parsed.data.version || currentDraft.status === "finished") return { error: "stale" };
  const services = formData.getAll("services").map(String).filter(Boolean).slice(0, 30);
  const typed = formData.getAll("newServices").map(String).filter(Boolean).slice(0, 5);
  const picked = await resolveServices(agency.id, services, typed);
  if (!picked.services.length && !picked.pending.length) return { error: "noServices" };
  const avatar = formData.get("avatar");
  const result = await patchProfile(agency, {
    name: parsed.data.name,
    bio: parsed.data.bio,
    // Never empties the saved services: only a non-empty choice replaces them.
    services: picked.services.length ? picked.services : undefined,
    // Typed services join the ones already waiting for review (docs/30), as in the full editor.
    pendingServices: picked.pending.length ? [...new Set([...agency.pendingServices, ...picked.pending])] : undefined,
    avatar: avatar instanceof File && avatar.size > 0 ? Buffer.from(await avatar.arrayBuffer()) : null,
  }, { version: parsed.data.version, userId: user.id });
  if ("error" in result) return { error: result.error };
  revalidatePath("/[locale]", "layout");
  return { view: (await getSetup(agency.id)) ?? undefined };
}

/** Step 2: which source the work comes from. Upload (and PDF pictures already staged) go on to the client step. */
export async function chooseSourceAction(v: number, source: "upload" | "pdf" | "behance" | "social"): Promise<SetupResult> {
  const { agency } = await requireAgency();
  const s = z.enum(["upload", "pdf", "behance", "social"]).parse(source);
  if ((s === "pdf" || s === "behance") && !(await canUse("portfolio_import"))) return { error: "unavailable" };
  // Changing the source drops what another source staged (its images stay only if uploaded here).
  return done(await writeSetup(agency.id, version.parse(v), { data: { source: s }, clear: s === "behance" ? ["socialItemId"] : s === "social" ? ["behance"] : ["behance", "socialItemId"], step: s === "upload" || s === "pdf" ? 3 : 2 }));
}

const behanceSchema = z.object({
  projectUrl: z.string().url().max(500),
  images: z.array(z.string().url().max(1000)).min(1).max(Math.min(MAX_IMAGES_PER_POST, BEHANCE_LIMITS.imagesPerProject)),
  title: z.string().max(200),
  caption: z.string().max(BEHANCE_LIMITS.caption),
  client: z.string().max(80).nullable(),
  publishedAt: z.string().datetime().nullable().optional(),
});

/** A Behance project the importer read comes back into this draft (nothing is published by reading). */
export async function stageBehanceAction(v: number, input: unknown): Promise<SetupResult> {
  const { agency } = await requireAgency();
  if (!(await canUse("portfolio_import"))) return { error: "unavailable" };
  const parsed = behanceSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const b = parsed.data;
  try {
    assertBehanceUrl(b.projectUrl);
    b.images.forEach((u) => assertBehanceUrl(u));
  } catch {
    return { error: "invalid" };
  }
  const current = await getSetup(agency.id);
  // Prefill once: known text is offered, never forced over what the owner already wrote.
  const project = current?.data.project?.title
    ? current.data.project
    : { title: b.title.trim().slice(0, 120), contribution: current?.data.project?.contribution ?? "", services: current?.data.project?.services ?? agency.services.slice(0, 3) };
  return done(
    await writeSetup(agency.id, version.parse(v), {
      data: { source: "behance", behance: { projectUrl: b.projectUrl, images: b.images, publishedAt: b.publishedAt ?? null, clientSuggestion: b.client?.trim() || null }, project },
      clear: ["socialItemId"],
      step: 3,
    }),
  );
}

/** A connected platform's item picked in the browser: looked up server-side for this agency, then staged. */
export async function stageSocialItemAction(v: number, itemRowId: string): Promise<SetupResult> {
  const { agency } = await requireAgency();
  const id = uuid.safeParse(itemRowId);
  if (!id.success) return { error: "item" };
  const found = await getItemForAgency(agency.id, id.data);
  if (!found || "error" in (await stageItem(agency.id, id.data))) return { error: "item" };
  const current = await getSetup(agency.id);
  const project = current?.data.project?.title
    ? current.data.project
    : { title: found.item.title.slice(0, 120), contribution: current?.data.project?.contribution ?? "", services: current?.data.project?.services ?? agency.services.slice(0, 3) };
  // A managed client's account suggests that client (confirmed on the next step, never assumed).
  const client = current?.data.client ?? (found.resource.ownership === "client" && found.resource.clientId ? { mode: "existing" as const, clientId: found.resource.clientId } : undefined);
  return done(await writeSetup(agency.id, version.parse(v), { data: { source: "social", socialItemId: id.data, project, ...(client ? { client } : {}) }, clear: ["behance"], step: 3 }));
}

const clientSchema = z.object({
  version,
  mode: z.enum(["existing", "new", "personal", "private"]),
  clientId: z.string().uuid().optional(),
  name: z.string().max(80).optional(),
});

/** Step 3: an existing client of this agency, a new one (added once), personal work, or a client kept private. */
export async function saveClientStepAction(input: unknown): Promise<SetupResult> {
  const { agency } = await requireAgency();
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const c = parsed.data;
  let client: { mode: "existing" | "personal" | "private"; clientId?: string };
  if (c.mode === "existing") {
    const owned = c.clientId ? await ownedClientId(agency.id, c.clientId) : null;
    if (!owned) return { error: "client" };
    client = { mode: "existing", clientId: owned };
  } else if (c.mode === "new") {
    if (!rateLimit(`setup-client:${agency.id}`, 20, 60 * 60 * 1000)) return { error: "invalid" };
    const added = await addClientOnce(agency.id, c.name ?? "", { version: c.version });
    if ("error" in added) return { error: added.error };
    return { view: (await getSetup(agency.id)) ?? undefined };
  } else client = { mode: c.mode };
  return done(await writeSetup(agency.id, c.version, { data: { client }, step: 4 }));
}

const projectSchema = z.object({
  version,
  title: z.string().trim().min(2).max(120),
  contribution: z.string().trim().min(2).max(600),
  services: z.array(z.string().max(60)).min(1).max(6),
  behanceImages: z.array(z.string().url().max(1000)).max(MAX_IMAGES_PER_POST).optional(),
});

/** Step 4: the project text and services; Preview never publishes. */
export async function saveProjectStepAction(input: unknown): Promise<SetupResult> {
  const { agency } = await requireAgency();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.path[0] === "services" ? "noServices" : "noProject" };
  const p = parsed.data;
  const services = [...new Set(p.services)].filter(isServiceKey);
  if (!services.length) return { error: "noServices" };
  const current = await getSetup(agency.id);
  // Removing Behance images keeps the rest in their order; nothing new can be added this way.
  const behance = current?.data.behance && p.behanceImages ? { ...current.data.behance, images: current.data.behance.images.filter((u) => p.behanceImages!.includes(u)) } : current?.data.behance;
  return done(await writeSetup(agency.id, p.version, { data: { project: { title: p.title, contribution: p.contribution, services }, ...(behance ? { behance } : {}) }, step: 5 }));
}

export async function uploadSetupMediaAction(formData: FormData): Promise<SetupResult> {
  const { agency } = await requireAgency();
  if (!rateLimit(`setup-media:${agency.id}`, 60, 60 * 60 * 1000)) return { error: "tooMany" };
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0).slice(0, MAX_IMAGES_PER_POST);
  if (!files.length) return { error: "noMedia" };
  const source = formData.get("source") === "pdf" ? "pdf" : "upload";
  if (source === "pdf" && !(await canUse("portfolio_import"))) return { error: "unavailable" };
  const result = await addSetupMedia(agency.id, await Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer()))), source);
  return "error" in result ? { error: result.error } : { media: result, view: (await getSetup(agency.id)) ?? undefined };
}

export async function removeSetupMediaAction(id: string): Promise<SetupResult> {
  const { agency } = await requireAgency();
  const media = await removeSetupMedia(agency.id, uuid.parse(id));
  return { media, view: (await getSetup(agency.id)) ?? undefined };
}

export async function orderSetupMediaAction(ids: string[]): Promise<SetupResult> {
  const { agency } = await requireAgency();
  const parsed = z.array(uuid).max(MAX_IMAGES_PER_POST).safeParse(ids);
  if (!parsed.success) return { error: "invalid" };
  const result = await orderSetupMedia(agency.id, parsed.data);
  return "error" in result ? { error: result.error } : { media: result, view: (await getSetup(agency.id)) ?? undefined };
}

/** Step 5: the owner's explicit publish, with the rights confirmation; happens once. */
export async function publishSetupAction(v: number, rights: boolean): Promise<SetupResult> {
  const { user, agency } = await requireAgency();
  const existing = await getSetup(agency.id);
  if (!existing?.postId && !canCreatePost(entitlementsFor(agency), agency.postCount)) return { error: "limit" };
  const label = (await getTranslations({ locale: contentLang(agency.contentLang), namespace: "Setup" }))("client.personalLabel");
  const result = await publishSetup({ agencyId: agency.id, userId: user.id, version: version.parse(v), rights: rights === true, personalLabel: label });
  if ("error" in result) return { error: result.error };
  revalidatePath("/[locale]", "layout");
  return { postId: result.postId, view: (await getSetup(agency.id)) ?? undefined };
}

/** "Add another project": a fresh draft through the same steps (starting at the source). */
export async function startAnotherAction(): Promise<SetupResult> {
  const { user, agency } = await requireAgency();
  await restartSetup(agency.id, user.id);
  return { view: await openSetup(agency.id, user.id) };
}

/** From Studio → Connected platforms: an item picked there opens the setup flow with it staged (never published). */
export async function startSetupWithItemAction(itemRowId: string): Promise<SetupResult> {
  const { user, agency } = await requireAgency();
  let view = await openSetup(agency.id, user.id);
  if (view.status === "finished") {
    await restartSetup(agency.id, user.id);
    view = await openSetup(agency.id, user.id);
  }
  return stageSocialItemAction(view.version, itemRowId);
}
