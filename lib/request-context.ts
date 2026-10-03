import "server-only";
import { cookies, headers } from "next/headers";
import type { RequestContext } from "@/lib/core/rules/request-context";

/** The current Next request as a RequestContext (pages, layouts, server actions). */
export async function nextRequestContext(): Promise<RequestContext> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  return { header: (name) => h.get(name), cookie: (name) => c.get(name)?.value ?? null };
}
