import type { MetadataRoute } from "next";
import { siteIndexable } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

// Whole sections (prefix match) and token links (trailing slash, so /ar/c/…
// is blocked but /ar/contact is not).
const PRIVATE = ["studio", "admin", "saved", "requests", "login", "support", "c/", "r/", "review/", "pay/", "join/staff/"];

// Search and AI answer engines are welcome on public pages (OneClickConvert's
// policy): being cited by ChatGPT, Claude, Perplexity and Google's AI answers
// brings the same business owners who search.
const ANSWER_ENGINES = [
  "Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "ClaudeBot", "Claude-SearchBot", "Claude-User",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot", "Applebot-Extended", "DuckAssistBot", "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  if (!siteIndexable()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  const disallow = [...PRIVATE.flatMap((p) => [`/ar/${p}`, `/en/${p}`]), "/api/"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: ANSWER_ENGINES, allow: ["/", "/llms.txt"], disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
