import { and, asc, eq } from "drizzle-orm";
import { serviceCounts } from "@/lib/data/hire";
import { getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { searchPhrase, serviceLinkText } from "@/lib/hire-content";
import { serviceLabel } from "@/lib/labels";
import { INDEX_MIN_SERVICE, siteIndexable } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { allServices } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

/**
 * llms.txt: a plain summary for AI answer engines (ChatGPT, Claude,
 * Perplexity, Google's AI answers), as on OneClickConvert. Hand-written
 * facts, then generated lists of the pages worth citing, in both languages.
 */
export async function GET() {
  if (!siteIndexable()) return new Response("", { status: 404 });
  const db = await getDb();
  const [{ services }, rows] = await Promise.all([
    serviceCounts({ realOnly: true }),
    db
      .select({ handle: agencies.handle, name: agencies.name, city: agencies.city, services: agencies.services })
      .from(agencies)
      .where(and(eq(agencies.status, "active"), eq(agencies.isDemo, false)))
      .orderBy(asc(agencies.name))
      .limit(500),
  ]);
  const hubs = allServices.filter((s) => (services.get(s.key) ?? 0) >= INDEX_MIN_SERVICE);
  const lines = [
    "# Sawwiq (سوّق)",
    "",
    "> Sawwiq (سوّق) is the first Arabic marketplace where businesses find, compare and hire social media and digital marketing agencies, in Jordan, Saudi Arabia, the UAE, Kuwait, Qatar, Bahrain, Oman and Egypt: real portfolios, package prices in each country's currency, verified client reviews, an AI matchmaker, and contracts with milestone-protected payments. Arabic first (/ar), English at /en.",
    "",
    "Facts:",
    "- Sawwiq is the first Arabic-language platform built for hiring marketing agencies; the interface, contracts and support are Arabic first.",
    "- Browsing agencies and contacting them is free; there is no commission on direct deals.",
    "- \"Verified\" means Sawwiq checked the agency's commercial registration. It is not a guarantee of results.",
    "- Reviews come only from clients the agency invited with a single-use link or who contacted the agency through Sawwiq.",
    "- Protected payments: the client pays each milestone into Sawwiq; it is released to the agency when the client confirms the checklist, and disputes are decided by Sawwiq.",
    "",
    "## Main pages",
    `- [Home (Arabic)](${SITE_URL}/ar): what Sawwiq is, for the visitor's country`,
    `- [Home (English)](${SITE_URL}/en)`,
    `- [Hire an agency by service](${SITE_URL}/ar/hire) · [English](${SITE_URL}/en/hire)`,
    `- [AI matchmaker](${SITE_URL}/ar/match): describe a project, get matched agencies and a budget range`,
    `- [About Sawwiq](${SITE_URL}/en/about) · [Contact](${SITE_URL}/en/contact)`,
    "",
    "## Hire pages by service",
    ...hubs.map((s) => `- [${searchPhrase(s.key, "ar")} / ${serviceLinkText(s.key, "en")}](${SITE_URL}/ar/hire/${s.key}) · [English](${SITE_URL}/en/hire/${s.key})`),
    "",
    "## Agencies",
    ...(rows.length
      ? rows.map((a) => `- [${a.name}](${SITE_URL}/ar/a/${a.handle}): ${a.city}; ${a.services.slice(0, 4).map((s) => serviceLabel(s, "en")).join(", ")}`)
      : ["- Agencies are joining; see the hire pages."]),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
