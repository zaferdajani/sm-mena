import "server-only";
import { headers } from "next/headers";
import { clientIpFrom } from "@/lib/core/rules/request-context";
import { isCrawler } from "@/lib/crawler";
import { nextRequestContext } from "@/lib/request-context";

export async function clientIp(): Promise<string> {
  return clientIpFrom(await nextRequestContext());
}

/** Robots don't count as views (lib/crawler.ts). */
export async function isCrawlerRequest(): Promise<boolean> {
  return isCrawler((await headers()).get("user-agent"));
}
