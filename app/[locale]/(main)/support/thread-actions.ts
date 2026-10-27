"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/data/agencies";
import { discardFiles, hasMedia, storeMedia, storeScreenshots } from "@/lib/data/support-files";
import { addReporterMessage, confirmFixed, threadByToken } from "@/lib/data/support-threads";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

// The reporter's side of a report conversation (docs/63). The private token in
// the link is the permission: it reaches this one report only.

export type ThreadReplyState = { error?: "required" | "rateLimited" | "screenshot" | "media"; done?: boolean } | undefined;

export async function replyThreadAction(_: ThreadReplyState, formData: FormData): Promise<ThreadReplyState> {
  const thread = await threadByToken(String(formData.get("token") ?? ""));
  if (!thread) return { error: "required" };
  if (!rateLimit(`thread:${await clientIp()}`, 20, 60 * 60 * 1000)) return { error: "rateLimited" };
  const body = String(formData.get("message") ?? "").trim().slice(0, 4000);
  if (body.length < 2 && !hasMedia(formData) && !formData.getAll("screenshots").some((f) => f instanceof File && f.size > 0)) return { error: "required" };
  const screenshots = await storeScreenshots(formData);
  if (!screenshots) return { error: "screenshot" };
  const attachments = await storeMedia(formData);
  if (!attachments) {
    await discardFiles(screenshots);
    return { error: "media" };
  }
  await addReporterMessage(thread.request.id, body || "(attachment only)", screenshots, attachments);
  await audit(null, "support.reporter_reply", "support_request", thread.request.id);
  revalidatePath("/[locale]/support/t/[token]", "page");
  return { done: true };
}

export async function confirmThreadAction(formData: FormData) {
  const thread = await threadByToken(String(formData.get("token") ?? ""));
  if (!thread || thread.request.confirmedAt) return;
  await confirmFixed(thread.request.id);
  await audit(null, "support.reporter_confirmed", "support_request", thread.request.id);
  revalidatePath("/[locale]/support/t/[token]", "page");
}
