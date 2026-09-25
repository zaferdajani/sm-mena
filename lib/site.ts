/** Public base URL used in share links, WhatsApp messages, sitemaps and metadata. */
// On Vercel the production domain is known even when NEXT_PUBLIC_SITE_URL wasn't set.
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || vercelDomain || "http://localhost:3000").replace(/\/$/, "");
