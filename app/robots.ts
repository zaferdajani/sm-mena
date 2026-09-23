import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/ar/studio", "/en/studio", "/ar/admin", "/en/admin", "/ar/saved", "/en/saved", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
