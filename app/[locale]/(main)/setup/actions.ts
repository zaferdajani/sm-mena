"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { audit, updateAgency } from "@/lib/data/agencies";
import { addDraftMedia, ensureDraft, finishDraft, pauseDraft, patchDraft, removeDraftMedia, setDraftCover, startAnotherProject, type DraftError } from "@/lib/data/onboarding";
import { saveClient } from "@/lib/data/portfolio-clients";
import { ImageError, MAX_IMAGES_PER_POST, newAvatarKey, processAvatar, processImage } from "@/lib/images";
import { PLATFORMS } from "@/lib/labels";
import { canCreatePost, entitlementsFor } from "@/lib/monetization/entitlements";
import { resolveServices } from "@/lib/services/tags";
import { storage } from "@/lib/storage";

// First-run portfolio setup (docs/53). Every action re-reads the signed-in
// agency, refuses a form built from a stale draft version, and never
// publishes anything: finishing creates the post through the same rows as
// Studio → New, with the page's visibility untouched.

export type SetupState = { error?: string } | undefined;
const list = (fd: FormData, key: string) => fd.getAll(key).map(String).map((s) => s.trim()).filter(Boolean);
const version = (fd: FormData) => Number.parseInt(String(fd.get("version") ?? ""), 10) || 0;
const failed = (r: unknown): r is DraftError => typeof r === "object" && r !== null && "error" in r;

async function go(step: number, extra: Record<string, string> = {}) {
  const locale = await getLocale();
  const q = new URLSearchParams({ step: String(step), ...extra }).toString();
  return redirect({ href: `/setup?${q}`, locale });
}

/** Step 1: logo or photo, introduction and services. Only these fields change; contacts, roles, translations and the name stay as they are. */
export async function saveProfileStepAction(_: SetupState, fd: FormData): Promise<SetupState> {
  const { user, agency } = await requireAgency();
  const draft = await ensureDraft(agency);
  const d = z.object({ bio: z.string().trim().max(500) }).safeParse({ bio: fd.get("bio") ?? "" });
  if (!d.success) return { error: "bio" };
  const picked = await resolveServices(agency.id, list(fd, "services"), list(fd, "newServices"));
  let avatarKey: string | undefined;
  const avatar = fd.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    try {
      avatarKey = newAvatarKey(agency.id);
      await storage().put(avatarKey, await processAvatar(Buffer.from(await avatar.arrayBuffer())), "image/webp");
    } catch {
      return { error: "avatar" };
    }
  }
  await updateAgency(agency.id, {
    bio: d.data.bio,
    services: picked.services.length ? picked.services : agency.services,
    pendingServices: [...new Set([...agency.pendingServices, ...picked.pending])],
    ...(avatarKey ? { avatarKey } : {}),
  });
  if (avatarKey && agency.avatarKey) await storage().remove([agency.avatarKey]).catch(() => {});
  await audit(user.id, "agency.update", "agency", agency.id, { via: "setup" });
  const r = await patchDraft(agency.id, version(fd) || draft.version, { step: 2 });
  if (failed(r)) return go(1, { stale: "1" });
  revalidatePath("/[locale]", "layout");
  return go(2);
}

/** "Do this later" / Back: move between steps without changing anything else. */
export async function goToStepAction(fd: FormData) {
  const { agency } = await requireAgency();
  const step = Math.min(5, Math.max(1, Number.parseInt(String(fd.get("step") ?? "1"), 10) || 1));
  const draft = await ensureDraft(agency);
  if (draft.status !== "finished") await patchDraft(agency.id, draft.version, { step });
  return go(step);
}

/** Step 2 (upload) and step 4 (add more): images go to the draft's private space. */
export async function uploadMediaAction(_: SetupState, fd: FormData): Promise<SetupState> {
  const { agency } = await requireAgency();
  const draft = await ensureDraft(agency);
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "noImages" };
  if (files.length + draft.media.length > MAX_IMAGES_PER_POST) return { error: "tooMany" };
  if (!canCreatePost(entitlementsFor(agency), agency.postCount)) return { error: "limit" };
  const backTo = Number.parseInt(String(fd.get("returnStep") ?? "3"), 10) || 3;
  try {
    const processed = await Promise.all(files.map(async (f) => processImage(Buffer.from(await f.arrayBuffer()))));
    const r = await addDraftMedia(agency.id, processed, { source: draft.source ?? "upload", step: backTo });
    if (failed(r)) return { error: r.error === "too_many" ? "tooMany" : "generic" };
  } catch (error) {
    return { error: error instanceof ImageError ? error.code : "generic" };
  }
  return go(backTo);
}

export async function removeMediaAction(fd: FormData) {
  const { agency } = await requireAgency();
  const key = String(fd.get("key") ?? "");
  if (key.startsWith(`portfolio/${agency.id}/drafts/`)) await removeDraftMedia(agency.id, key);
  return go(4);
}

export async function setCoverAction(fd: FormData) {
  const { agency } = await requireAgency();
  const r = await setDraftCover(agency.id, version(fd), Number.parseInt(String(fd.get("index") ?? "0"), 10) || 0);
  return go(4, failed(r) ? { stale: "1" } : {});
}

/** Step 3: who the work was for. A new client is created only from a name the person typed and confirmed here. */
export async function saveClientStepAction(_: SetupState, fd: FormData): Promise<SetupState> {
  const { agency } = await requireAgency();
  const mode = String(fd.get("mode") ?? "");
  if (!["client", "personal", "private"].includes(mode)) return { error: "mode" };
  let clientId: string | null = null;
  if (mode === "client") {
    const existing = String(fd.get("clientId") ?? "");
    const name = String(fd.get("newClient") ?? "").trim().slice(0, 80);
    if (existing) clientId = existing;
    else if (name.length >= 2) {
      const saved = await saveClient(agency.id, null, { name, industry: null, country: null, description: "", links: [] });
      if (!("ok" in saved)) return { error: saved.error === "limit" ? "clientLimit" : "client" };
      clientId = saved.id;
    } else return { error: "client" };
  }
  const r = await patchDraft(agency.id, version(fd), { clientMode: mode, clientId, suggestedClient: null, step: 4 });
  if (failed(r)) return r.error === "client" ? { error: "client" } : go(3, { stale: "1" });
  return go(4);
}

/** Step 4: the project. Nothing is published; "Preview" only moves to step 5. */
export async function saveProjectStepAction(_: SetupState, fd: FormData): Promise<SetupState> {
  const { agency } = await requireAgency();
  const draft = await ensureDraft(agency);
  const d = z.object({ title: z.string().trim().min(2).max(120), contribution: z.string().trim().max(300) }).safeParse({ title: fd.get("title") ?? "", contribution: fd.get("contribution") ?? "" });
  if (!d.success) return { error: "title" };
  const picked = await resolveServices(agency.id, list(fd, "services"), []);
  if (!picked.services.length) return { error: "noServices" };
  if (!draft.media.length) return { error: "noImages" };
  const platforms = list(fd, "platforms").filter((p) => (PLATFORMS as readonly string[]).includes(p));
  const r = await patchDraft(agency.id, version(fd), { title: d.data.title, contribution: d.data.contribution, services: picked.services, platforms, step: 5 });
  if (failed(r)) return go(4, { stale: "1" });
  return go(5);
}

/** Step 5: "Save my portfolio". Creates the post once; a retried submit returns the same post. */
export async function finishSetupAction(_: SetupState, fd: FormData): Promise<SetupState> {
  const { user, agency } = await requireAgency();
  if (!canCreatePost(entitlementsFor(agency), agency.postCount)) return { error: "limit" };
  let r: Awaited<ReturnType<typeof finishDraft>>;
  try {
    r = await finishDraft(agency.id, version(fd));
  } catch {
    return { error: "generic" };
  }
  if (failed(r)) return r.error === "stale" ? go(5, { stale: "1" }) : { error: r.error === "no_media" ? "noImages" : r.error === "no_services" ? "noServices" : "generic" };
  if (r.created) await audit(user.id, "post.create", "post", r.postId, { via: "setup" });
  revalidatePath("/[locale]", "layout");
  const locale = await getLocale();
  return redirect({ href: `/setup?done=1&post=${r.postId}`, locale });
}

export async function anotherProjectAction(fd: FormData) {
  const { agency } = await requireAgency();
  const draft = await startAnotherProject(agency, fd.get("keepClient") === "1");
  return go(draft.step);
}

/** "Finish later": the draft stays private and resumable; the person goes to the Studio. */
export async function pauseSetupAction() {
  const { agency } = await requireAgency();
  await pauseDraft(agency.id);
  const locale = await getLocale();
  return redirect({ href: "/studio", locale });
}
