"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireAgency } from "@/lib/auth/guards";
import { currentSessionId } from "@/lib/auth/session";
import { audit } from "@/lib/data/agencies";
import { browseItems, confirmResources, disconnectGrant, startAttempt, type OfferedItem, type SocialError } from "@/lib/data/social";
import { rateLimit } from "@/lib/rate-limit";
import { isSocialProvider } from "@/lib/social/providers";

// Studio → Connected platforms and setup step 2 (docs/53). Server actions carry
// Next's same-origin protection; each re-checks the signed-in agency.

const startSchema = z.object({
  provider: z.string().refine(isSocialProvider),
  ownership: z.enum(["own", "client"]),
  clientId: z.union([z.literal(""), z.string().uuid()]).optional(),
  returnTo: z.enum(["setup", "connections"]),
});

/** Leaves for the platform's own consent screen; no password or token is ever asked for here. */
export async function startConnectionAction(formData: FormData): Promise<{ error: SocialError }> {
  const { user, agency } = await requireAgency();
  const parsed = startSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !isSocialProvider(parsed.data.provider)) return { error: "failed" };
  if (!rateLimit(`social-start:${agency.id}`, 20, 60 * 60 * 1000)) return { error: "quota" };
  const sessionId = await currentSessionId();
  if (!sessionId) return { error: "mismatch" };
  const result = await startAttempt({
    provider: parsed.data.provider,
    userId: user.id,
    agencyId: agency.id,
    sessionId,
    ownership: parsed.data.ownership,
    clientId: parsed.data.ownership === "client" && parsed.data.clientId ? parsed.data.clientId : null,
    locale: await getLocale(),
    returnTo: parsed.data.returnTo,
  });
  if ("error" in result) return result;
  redirect(result.url);
}

export async function confirmResourcesAction(grantId: string, resourceIds: string[]) {
  const { user, agency } = await requireAgency();
  const parsed = z.object({ grantId: z.string().uuid(), ids: z.array(z.string().uuid()).min(1).max(20) }).safeParse({ grantId, ids: resourceIds });
  if (!parsed.success) return { error: "mismatch" as const };
  const result = await confirmResources(agency.id, parsed.data.grantId, parsed.data.ids);
  if ("ok" in result) await audit(user.id, "social.select", "agency", agency.id, { selected: result.selected });
  return result;
}

export async function browseItemsAction(resourceId: string, cursor: string | null): Promise<{ items: OfferedItem[]; next: string | null } | { error: SocialError }> {
  const { agency } = await requireAgency();
  const id = z.string().uuid().safeParse(resourceId);
  if (!id.success) return { error: "not_found" };
  if (!rateLimit(`social-browse:${agency.id}`, 60, 60 * 60 * 1000)) return { error: "quota" };
  const result = await browseItems(agency.id, id.data, typeof cursor === "string" ? cursor.slice(0, 300) : null);
  // Only what the picker shows: no raw provider responses.
  if ("error" in result) return result;
  return { items: result.items.map(({ rowId, id: itemId, mediaKind, title, caption, permalink, thumbnailUrl, publishedAt, displayable, state, postId }) => ({ rowId, id: itemId, mediaKind, title, caption: caption.slice(0, 300), permalink, thumbnailUrl, publishedAt, displayable, state, postId })), next: result.next };
}

export async function disconnectAction(grantId: string) {
  const { user, agency } = await requireAgency();
  const id = z.string().uuid().safeParse(grantId);
  if (!id.success) return { error: "not_found" as const };
  const result = await disconnectGrant(agency.id, id.data);
  if ("ok" in result) await audit(user.id, "social.disconnect", "agency", agency.id, { remote: result.remote });
  return result;
}
