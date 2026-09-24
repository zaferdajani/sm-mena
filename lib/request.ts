import "server-only";
import { headers } from "next/headers";
import { isCrawler } from "@/lib/crawler";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Robots don't count as views (lib/crawler.ts). */
export async function isCrawlerRequest(): Promise<boolean> {
  return isCrawler((await headers()).get("user-agent"));
}
