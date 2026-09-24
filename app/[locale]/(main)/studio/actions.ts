"use server";


import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { pingIndexNow } from "@/lib/indexnow";
import { requireAgency } from "@/lib/auth/guards";
import { audit, isHandleTaken, updateAgency } from "@/lib/data/agencies";
import { setInquiryStatus, markAllRead } from "@/lib/data/inbox";
import { createPackage, deletePackage, updatePackage } from "@/lib/data/packages";
import { createPost, deletePost, togglePin, updatePost } from "@/lib/data/posts";
import { createReviewInvite, replyToReview } from "@/lib/data/reviews";
import { normalizeLines } from "@/lib/deliverables";
import { connectGoogle } from "@/lib/google";
import { ImageError, MAX_IMAGES_PER_POST, newAvatarKey, processAvatar } from "@/lib/images";
import { CITIES, INDUSTRIES, PLATFORMS, TEAM_SIZES } from "@/lib/labels";
import { canCreatePost, canSendProposal, entitlementsFor } from "@/lib/monetization/entitlements";
import { proposalsThisMonth, submitProposal } from "@/lib/data/requests";
import { storage } from "@/lib/storage";
import { isServiceKey } from "@/lib/taxonomy";
import { instagramHandle, normalizePhone, normalizeUrl, validateHandle } from "@/lib/text";

export type StudioState = { ok?: boolean; error?: string } | undefined;

const list = (formData: FormData, key: string) => formData.getAll(key).map(String).filter(Boolean);
const oneOf = <T extends readonly string[]>(values: T, allowed: T) => [...new Set(values)].filter((v) => (allowed as readonly string[]).includes(v));

function postFields(formData: FormData) {
  const services = [...new Set(list(formData, "services"))].filter(isServiceKey);
  const platforms = oneOf(list(formData, "platforms") as unknown as typeof PLATFORMS, PLATFORMS);
  const industryRaw = String(formData.get("industry") ?? "");
  return {
    caption: String(formData.get("caption") ?? "").trim().slice(0, 2200),
    services,
    platforms: platforms as string[],
    industry: (INDUSTRIES as readonly string[]).includes(industryRaw) ? industryRaw : null,
    result: String(formData.get("result") ?? "").trim().slice(0, 80) || null,
  };
}

export async function createPostAction(_: StudioState, formData: FormData): Promise<StudioState> {
  const { agency } = await requireAgency();
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "noImages" };
  if (files.length > MAX_IMAGES_PER_POST) return { error: "tooMany" };
  const fields = postFields(formData);
  if (!fields.services.length) return { error: "noServices" };
  if (!canCreatePost(entitlementsFor(agency), agency.postCount)) return { error: "limit" };

  let postId: string;
  try {
    const buffers = await Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer())));
    const post = await createPost(agency.id, fields, buffers);
    postId = post.id;
  } catch (error) {
    return { error: error instanceof ImageError ? error.code : "generic" };
  }
  if (!agency.isDemo) pingIndexNow([`/a/${agency.handle}`, `/p/${postId}`]);
  const locale = await getLocale();
  return redirect({ href: `/p/${postId}`, locale });
}

export async function updatePostAction(_: StudioState, formData: FormData): Promise<StudioState> {
  const { agency } = await requireAgency();
  const postId = z.string().uuid().safeParse(formData.get("postId"));
  if (!postId.success) return { error: "generic" };
  const fields = postFields(formData);
  if (!fields.services.length) return { error: "noServices" };
  const updated = await updatePost(postId.data, agency.id, fields);
  if (!updated) return { error: "generic" };
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}

export async function deletePostAction(postId: string) {
  const { user, agency } = await requireAgency();
  const id = z.string().uuid().parse(postId);
  if (await deletePost(id, agency.id)) await audit(user.id, "post.delete", "post", id);
  const locale = await getLocale();
  return redirect({ href: "/studio/posts", locale });
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  handle: z.string().trim().toLowerCase(),
  bio: z.string().trim().max(500).default(""),
  city: z.enum(CITIES),
  startingPriceJod: z.union([z.literal(""), z.coerce.number().int().min(0).max(100000)]),
  whatsapp: z.string().trim().max(20),
  phone: z.string().trim().max(20),
  email: z.union([z.literal(""), z.string().trim().email()]),
  website: z.string().trim().max(200),
  instagram: z.string().trim().max(200),
  foundedYear: z.union([z.literal(""), z.coerce.number().int().min(1950).max(new Date().getFullYear())]),
  teamSize: z.union([z.literal(""), z.enum(TEAM_SIZES)]),
});

export async function updateProfileAction(_: StudioState, formData: FormData): Promise<StudioState> {
  const { user, agency } = await requireAgency();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { error: field === "name" ? "name" : field === "email" ? "email" : "generic" };
  }
  const d = parsed.data;
  const handleCheck = validateHandle(d.handle);
  if (handleCheck === "invalid") return { error: "handleInvalid" };
  if (handleCheck === "reserved") return { error: "handleReserved" };
  if (await isHandleTaken(d.handle, agency.id)) return { error: "handleTaken" };

  const whatsapp = d.whatsapp ? normalizePhone(d.whatsapp) : null;
  const phone = d.phone ? normalizePhone(d.phone) : null;
  if ((whatsapp && !/^\+?\d{8,15}$/.test(whatsapp)) || (phone && !/^\+?\d{8,15}$/.test(phone))) return { error: "phone" };
  const website = d.website ? normalizeUrl(d.website) : null;
  if (d.website && !website) return { error: "website" };

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

  await updateAgency(agency.id, {
    name: d.name,
    handle: d.handle,
    bio: d.bio,
    city: d.city,
    services: [...new Set(list(formData, "services"))].filter(isServiceKey),
    platforms: oneOf(list(formData, "platforms") as unknown as typeof PLATFORMS, PLATFORMS) as string[],
    industries: oneOf(list(formData, "industries") as unknown as typeof INDUSTRIES, INDUSTRIES) as string[],
    languages: oneOf(list(formData, "languages") as unknown as readonly ["ar", "en"], ["ar", "en"] as const) as string[],
    startingPriceJod: d.startingPriceJod === "" ? null : d.startingPriceJod,
    whatsapp,
    phone,
    email: d.email || null,
    website,
    instagram: d.instagram ? instagramHandle(d.instagram) : null,
    foundedYear: d.foundedYear === "" ? null : d.foundedYear,
    teamSize: d.teamSize || null,
    ...(avatarKey ? { avatarKey } : {}),
  });
  if (avatarKey && agency.avatarKey) await storage().remove([agency.avatarKey]).catch(() => {});
  await audit(user.id, "agency.update", "agency", agency.id);
  if (!agency.isDemo) pingIndexNow([`/a/${d.handle}`]);
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}

export async function setInquiryStatusAction(inquiryId: string, status: "read" | "archived" | "new") {
  const { agency } = await requireAgency();
  await setInquiryStatus(agency.id, z.string().uuid().parse(inquiryId), z.enum(["read", "archived", "new"]).parse(status));
  revalidatePath("/[locale]/studio/inbox", "page");
}

export async function markAllReadAction() {
  const { agency } = await requireAgency();
  await markAllRead(agency.id);
  revalidatePath("/[locale]/studio/inbox", "page");
}

// ---------------------------------------------------------------------------
// Reviews, packages, pins and Google rating
// ---------------------------------------------------------------------------
export type InviteState = { token?: string; clientName?: string; error?: string } | undefined;

export async function createReviewInviteAction(_: InviteState, formData: FormData): Promise<InviteState> {
  const { agency } = await requireAgency();
  const clientName = String(formData.get("clientName") ?? "").trim().slice(0, 80);
  const { token } = await createReviewInvite(agency.id, clientName);
  revalidatePath("/[locale]/studio/reviews", "page");
  return { token, clientName };
}

export async function replyReviewAction(formData: FormData) {
  const { agency } = await requireAgency();
  const reviewId = z.string().uuid().parse(formData.get("reviewId"));
  await replyToReview(agency.id, reviewId, String(formData.get("reply") ?? ""));
  revalidatePath("/[locale]", "layout");
}

const packageSchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).default(""),
  service: z.string().refine(isServiceKey),
  priceJod: z.coerce.number().int().min(1).max(100000),
  billing: z.enum(["monthly", "one_off"]),
  deliverables: z.string().max(1000).default(""),
});

export async function savePackageAction(_: StudioState, formData: FormData): Promise<StudioState> {
  const { agency } = await requireAgency();
  const parsed = packageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const f = String(parsed.error.issues[0]?.path[0]);
    return { error: f === "title" ? "title" : f === "priceJod" ? "price" : f === "service" ? "service" : "generic" };
  }
  let items: unknown = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    items = [];
  }
  const days = Number(formData.get("deliveryDays"));
  const input = {
    ...parsed.data,
    deliverables: parsed.data.deliverables.split("\n").map((d) => d.trim()).filter(Boolean).slice(0, 12),
    items: normalizeLines(items, PLATFORMS),
    deliveryDays: Number.isInteger(days) && days > 0 && days <= 365 ? days : null,
  };
  const id = String(formData.get("packageId") ?? "");
  const ok = id ? await updatePackage(agency.id, z.string().uuid().parse(id), input) : await createPackage(agency.id, input);
  if (!ok) return { error: id ? "generic" : "limit" };
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}

export async function deletePackageAction(packageId: string) {
  const { agency } = await requireAgency();
  await deletePackage(agency.id, z.string().uuid().parse(packageId));
  revalidatePath("/[locale]", "layout");
}

export async function togglePinAction(postId: string) {
  const { agency } = await requireAgency();
  const result = await togglePin(agency.id, z.string().uuid().parse(postId));
  revalidatePath("/[locale]", "layout");
  return result;
}

export type GoogleState = { status?: "connected" | "saved" | "not_found" | "cleared"; name?: string | null; rating?: number | null; count?: number | null } | undefined;

export async function connectGoogleAction(_: GoogleState, formData: FormData): Promise<GoogleState> {
  const { agency } = await requireAgency();
  const input = String(formData.get("google") ?? "").trim().slice(0, 500);
  const result = await connectGoogle(agency.id, agency.name, input);
  revalidatePath("/[locale]", "layout");
  return { status: result.status, name: result.place?.name, rating: result.place?.rating, count: result.place?.count };
}

// ---------------------------------------------------------------------------
// Opportunities (quotes on client project requests)
// ---------------------------------------------------------------------------
export type ProposalState = { ok?: boolean; error?: string } | undefined;

export async function submitProposalAction(_: ProposalState, formData: FormData): Promise<ProposalState> {
  const { agency } = await requireAgency();
  const parsed = z
    .object({
      requestId: z.string().uuid(),
      priceJod: z.coerce.number().int().min(1).max(1_000_000),
      billing: z.enum(["monthly", "one_off"]),
      timeline: z.string().trim().min(2).max(200),
      message: z.string().trim().min(10).max(2000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  if (!canSendProposal(entitlementsFor(agency), await proposalsThisMonth(agency.id))) return { error: "limit" };
  const { requestId, ...input } = parsed.data;
  const result = await submitProposal(agency, requestId, input);
  if ("error" in result) return { error: result.error };
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}
