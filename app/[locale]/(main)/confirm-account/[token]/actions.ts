"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { confirmClient } from "@/lib/data/portfolio-clients";
import { rateLimit } from "@/lib/rate-limit";
import { getVisitorId } from "@/lib/visitor";

/** The client confirms (docs/28). No sign-in: the link itself is the secret; a visitor is limited to a few per hour. */
export async function confirmAccountAction(formData: FormData) {
  const token = z.string().min(8).max(64).parse(String(formData.get("token") ?? ""));
  const visitorId = (await getVisitorId({ create: true })) ?? "anon";
  if (!rateLimit(`confirm-account:${visitorId}`, 10, 60 * 60 * 1000)) return;
  await confirmClient(token);
  revalidatePath("/[locale]", "layout");
  redirect({ href: { pathname: `/confirm-account/${token}`, query: { done: "1" } }, locale: await getLocale() });
}
