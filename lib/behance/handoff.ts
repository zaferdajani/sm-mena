import type { CountryCode } from "@/lib/countries";
import { draftFor, ownershipOf, suggestionFor } from "./map";
import { parseProfilePage, parseProjectPage } from "./parse";
import { HANDOFF_MESSAGE, HANDOFF_READY, type BehancePortfolio } from "./types";

// The browser path (docs/47). Behance's edge throttles cloud addresses, so a
// server read can be refused with 429 for hours. The provider's own browser is
// never throttled: a bookmarklet run on their Behance project page collects
// what that page already holds (its state JSON and Open Graph tags) and hands
// it to the Sawwiq import tab with postMessage. The same parsers read it, the
// same review follows, and the images are still pulled by the server from
// Behance's CDN. No password, no extension, nothing installed.

/** What the bookmarklet sends: the page's address, its JSON state blobs and its Open Graph tags. */
export type BehanceHandoff = {
  url: string;
  /** Text of every <script type="application/json"> on the page (the store state among them). */
  blobs: string[];
  meta: { title?: string; image?: string; description?: string };
};

/** Total bytes of state we accept from the browser. */
export const HANDOFF_MAX_BYTES = 3 * 1024 * 1024;

/**
 * The bookmarklet, as a `javascript:` link the provider drags to the bookmarks
 * bar. On a behance.net page it opens the Sawwiq import tab, waits for that tab
 * to say it is ready, and posts the page data to it and to nothing else.
 */
export function bookmarklet(siteUrl: string, locale: string): string {
  const target = `${siteUrl}/${locale}/studio/import/behance?handoff=1`;
  const code = `(function(){
if(!/(^|\\.)behance\\.net$/.test(location.hostname)){alert("Open your Behance project page first, then click this bookmark.");return;}
var m=function(p){var e=document.querySelector('meta[property="'+p+'"],meta[name="'+p+'"]');return e?e.getAttribute("content")||"":"";};
var blobs=[].slice.call(document.querySelectorAll('script[type="application/json"]')).map(function(s){return s.textContent||"";});
var data={type:"${HANDOFF_MESSAGE}",url:location.href,blobs:blobs,meta:{title:m("og:title"),image:m("og:image"),description:m("og:description")}};
var w=window.open("${target}","sawwiq-import");
if(!w){alert("Please allow pop-ups for behance.net, then click again.");return;}
window.addEventListener("message",function(ev){if(ev.origin==="${siteUrl}"&&ev.data&&ev.data.type==="${HANDOFF_READY}"){ev.source.postMessage(data,"${siteUrl}");}});
})();`;
  return `javascript:${encodeURIComponent(code.replace(/\n/g, ""))}`;
}

/** Rebuilds a page the parsers understand from what the bookmarklet collected. */
export function handoffHtml(h: BehanceHandoff): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const metas = Object.entries(h.meta)
    .filter(([, v]) => v)
    .map(([k, v]) => `<meta property="og:${k}" content="${esc(v!)}">`)
    .join("");
  const scripts = h.blobs.map((b) => `<script type="application/json">${b.replace(/<\/script/gi, "<\\/script")}</script>`).join("");
  return `<!DOCTYPE html><html><head>${metas}${scripts}</head><body></body></html>`;
}

/** One project, read from the provider's own browser, ready for the same review as a server read. */
export function portfolioFromHandoff(h: BehanceHandoff, agency: { handle: string; website: string | null; instagram: string | null; about: string; services: string[]; country: CountryCode }): BehancePortfolio | null {
  const html = handoffHtml(h);
  const project = parseProjectPage(html, h.url);
  if (!project || (!project.images.length && !project.cover)) return null;
  // The project state names its owners; the owner object carries the profile's website and links.
  const owner = project.owners[0] ?? null;
  const profile = owner ? parseProfilePage(html, owner) : null;
  const drafts = [draftFor(project, agency.country, agency.services)];
  return {
    profile,
    drafts,
    suggestion: suggestionFor(profile, drafts, agency, agency.country),
    ownership: ownershipOf(profile, agency),
    source: "project",
    truncated: false,
  };
}
