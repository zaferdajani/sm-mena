import type { CountryCode } from "@/lib/countries";
import { defaultFetcher, type Fetcher } from "./fetch";
import { draftFor, ownershipOf, suggestionFor } from "./map";
import { feedUrl, parseFeed, parseProfilePage, parseProjectId, parseProjectPage, parseUsername, profileUrl } from "./parse";
import { BEHANCE_LIMITS, type BehancePortfolio, type BehanceProject } from "./types";

export type BehanceAgency = { handle: string; website: string | null; instagram: string | null; about: string; services: string[]; country: CountryCode };

export class BehanceError extends Error {
  constructor(public code: "invalid" | "notFound" | "unreachable" | "busy" | "empty") {
    super(code);
  }
}

async function text(fetcher: Fetcher, url: string, accept: string) {
  let res;
  try {
    res = await fetcher(url, { accept, maxBytes: BEHANCE_LIMITS.pageBytes });
  } catch {
    throw new BehanceError("unreachable");
  }
  if (!res || res.status === 404) throw new BehanceError("notFound");
  // Behance's edge throttles busy or unfamiliar addresses (429, sometimes 403): a later retry usually works.
  if (res.status === 429 || res.status === 403) throw new BehanceError("busy");
  if (res.status >= 400) throw new BehanceError("unreachable");
  return res.body.toString("utf8");
}

/** One project page, with every image; null when Behance gave nothing usable. */
export async function loadProject(url: string, fetcher = defaultFetcher()): Promise<BehanceProject | null> {
  const html = await text(fetcher, url, "text/html");
  return parseProjectPage(html, url);
}

/** A few pages at a time: Behance, the function's memory and the provider's patience. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/**
 * Reads a Behance profile (username, profile link or a single project link)
 * and proposes drafts. Feed first (the official list of a profile's projects),
 * then each project page for its images and fields. Nothing is stored.
 */
export async function loadBehancePortfolio(input: string, agency: BehanceAgency, fetcher = defaultFetcher()): Promise<BehancePortfolio> {
  const projectId = parseProjectId(input);
  const username = projectId ? null : parseUsername(input);
  if (!projectId && !username) throw new BehanceError("invalid");

  let listed: BehanceProject[];
  let source: BehancePortfolio["source"] = "feed";
  if (projectId) {
    const project = await loadProject(`https://www.behance.net/gallery/${projectId}/project`, fetcher);
    if (!project) throw new BehanceError("notFound");
    listed = [project];
    source = "project";
  } else {
    listed = parseFeed(await text(fetcher, feedUrl(username!), "application/rss+xml, application/xml, text/xml"));
  }
  const truncated = listed.length > BEHANCE_LIMITS.projects;
  const chosen = listed.slice(0, BEHANCE_LIMITS.projects);

  // Each project page adds its images, fields and tags; a page that fails keeps the feed's cover.
  const projects = await mapLimit(chosen, 3, async (p) => {
    if (source === "project") return p;
    try {
      const full = await loadProject(p.url, fetcher);
      return full ? { ...p, ...full, title: full.title || p.title, description: full.description || p.description, cover: full.cover ?? p.cover, publishedAt: full.publishedAt ?? p.publishedAt } : p;
    } catch {
      return p;
    }
  });
  const owner = username ?? projects[0]?.owners[0] ?? null;
  let profile = null;
  if (owner) {
    try {
      profile = parseProfilePage(await text(fetcher, profileUrl(owner), "text/html"), owner);
    } catch {
      profile = null;
    }
  }
  const drafts = projects.filter((p) => p.images.length || p.cover).map((p) => draftFor(p, agency.country, agency.services));
  if (!drafts.length) throw new BehanceError("empty");
  return {
    profile,
    drafts,
    suggestion: suggestionFor(profile, drafts, agency, agency.country),
    ownership: ownershipOf(profile, agency),
    source,
    truncated,
  };
}
