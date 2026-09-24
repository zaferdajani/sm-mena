import { routing } from "@/i18n/routing";
import { siteIndexable } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

/**
 * IndexNow tells Bing, Yandex and others that a page changed, so new agency
 * pages and work appear in hours instead of weeks (OneClickConvert's
 * scripts/indexnow.mjs). Off unless INDEXNOW_KEY is set and the site is
 * indexable; never blocks or fails the action that triggered it.
 */
export function pingIndexNow(paths: string[]) {
  const key = process.env.INDEXNOW_KEY;
  if (!key || !siteIndexable() || !paths.length || process.env.NODE_ENV !== "production") return;
  const urlList = paths.flatMap((p) => routing.locales.map((l) => `${SITE_URL}/${l}${p}`));
  void fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(SITE_URL).host, key, keyLocation: `${SITE_URL}/indexnow.txt`, urlList }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}
