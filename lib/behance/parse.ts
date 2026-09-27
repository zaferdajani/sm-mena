import { isBehanceHost, type BehanceImage, type BehanceProfile, type BehanceProject } from "./types";

// Pure readers of what Behance serves, unit-tested on saved pages. Behance's
// page state changes shape without notice, so every reader is tolerant: it
// walks the JSON for the objects it recognises and falls back to the Open
// Graph tags every page carries. A change on Behance degrades the import
// (covers only), it never breaks it.

const RESERVED = new Set(["gallery", "galleries", "feeds", "search", "joblist", "jobs", "live", "assets", "collection", "collections", "hire", "pro", "for_you", "discover", "adobe", "onboarding", "login", "signup", "settings"]);

/** The username in "behance.net/name", "@name" or a bare "name"; null for a project link or nonsense. */
export function parseUsername(input: string): string | null {
  const s = input.trim().replace(/^@/, "");
  if (!s) return null;
  if (/^[A-Za-z0-9_.-]{2,64}$/.test(s)) return RESERVED.has(s.toLowerCase()) ? null : s;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!/(^|\.)behance\.net$/i.test(u.hostname)) return null;
    const first = u.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!/^[A-Za-z0-9_.-]{2,64}$/.test(first) || RESERVED.has(first.toLowerCase())) return null;
    return first;
  } catch {
    return null;
  }
}

/** The numeric id of a project link, "behance.net/gallery/123/slug". */
export function parseProjectId(input: string): string | null {
  const m = /behance\.net\/gallery\/(\d+)(?:\/|$|\?)/i.exec(input.trim());
  return m ? m[1] : null;
}

export const profileUrl = (username: string) => `https://www.behance.net/${encodeURIComponent(username)}`;
export const feedUrl = (username: string) => `https://www.behance.net/feeds/user?username=${encodeURIComponent(username)}`;

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

/** Tags out, whitespace tidy; what a feed summary or a description says in words. */
export function plainText(html: string): string {
  return decode(html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

const tag = (xml: string, name: string) => {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(xml);
  return m ? decode(m[1]).trim() : "";
};

/** The RSS feed of a profile: recent projects with title, link, summary, cover and date. */
export function parseFeed(xml: string): BehanceProject[] {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  const out: BehanceProject[] = [];
  for (const item of items) {
    const link = tag(item, "link") || (/<guid[^>]*>([^<]+)<\/guid>/i.exec(item)?.[1] ?? "").trim();
    const id = parseProjectId(link);
    if (!id) continue;
    const description = tag(item, "description");
    const cover = /<img[^>]+src=["']([^"']+)["']/i.exec(description)?.[1] ?? null;
    const date = tag(item, "pubDate");
    const at = date ? new Date(date) : null;
    out.push({
      id,
      url: link.replace(/^http:/, "https:"),
      title: plainText(tag(item, "title")).slice(0, 120),
      description: plainText(description).slice(0, 4000),
      cover,
      images: [],
      fields: [],
      tags: [],
      publishedAt: at && !Number.isNaN(at.getTime()) ? at : null,
      owners: [],
    });
  }
  return out;
}

/** Every JSON blob a page ships in a <script type="application/json"> (Behance's store state included). */
export function stateBlobs(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse(m[1]));
    } catch {
      // not JSON after all
    }
  }
  return out;
}

const meta = (html: string, prop: string) => {
  const m = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i").exec(html) ?? new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, "i").exec(html);
  return m ? decode(m[1]).trim() : "";
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Depth-first over a JSON tree, without loops; `visit` returns true to stop. */
function walk(root: unknown, visit: (o: Obj) => boolean | void, depth = 0, seen = new Set<unknown>()): boolean {
  if (depth > 40 || (typeof root !== "object") || root === null || seen.has(root)) return false;
  seen.add(root);
  if (isObj(root) && visit(root)) return true;
  const children = Array.isArray(root) ? root : Object.values(root as Obj);
  for (const c of children) if (walk(c, visit, depth + 1, seen)) return true;
  return false;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** The largest rendition of a Behance `sizes` map ({ original, max_1200, "808": url, … }). */
function bestSize(sizes: unknown): string | null {
  if (!isObj(sizes)) return null;
  const entries = Object.entries(sizes).filter(([, v]) => typeof v === "string" && /^https?:\/\//.test(v)) as [string, string][];
  if (!entries.length) return null;
  const rank = (k: string) => (k === "original" ? 1e9 : k === "source" ? 1e8 : Number(/(\d+)/.exec(k)?.[1] ?? 0));
  entries.sort((a, b) => rank(b[0]) - rank(a[0]));
  return entries[0][1];
}

function imagesOf(modules: unknown[]): BehanceImage[] {
  const out: BehanceImage[] = [];
  const push = (m: Obj) => {
    const url = bestSize(m.sizes) ?? (str(m.src) || null) ?? (str(m.url) || null);
    // Only Behance's own CDN: the server will download exactly these, nowhere else.
    if (!url || !/^https:\/\//.test(url) || !isBehanceHost(new URL(url).hostname)) return;
    out.push({ url, width: num(m.width) ?? num((m.dimensions as Obj | undefined)?.width), height: num(m.height) ?? num((m.dimensions as Obj | undefined)?.height) });
  };
  for (const m of modules) {
    if (!isObj(m)) continue;
    const type = str(m.type).toLowerCase();
    if (type === "image") push(m);
    else if (Array.isArray(m.components)) for (const c of m.components) if (isObj(c) && str(c.type).toLowerCase() !== "video") push(c);
  }
  return out;
}

const names = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => (isObj(x) ? str(x.name) || str(x.title) || str(x.label) : str(x))).filter(Boolean) : []);

/** A project page: title, description, every image module, fields, tags, owners and date. */
export function parseProjectPage(html: string, url: string): BehanceProject | null {
  const id = parseProjectId(url) ?? "";
  let found: Obj | null = null;
  for (const blob of stateBlobs(html)) {
    walk(blob, (o) => {
      if (Array.isArray(o.modules) && (typeof o.name === "string" || typeof o.id === "number")) {
        found = o;
        return true;
      }
    });
    if (found) break;
  }
  const ogTitle = meta(html, "og:title");
  const ogImage = meta(html, "og:image");
  const ogDesc = meta(html, "og:description");
  if (!found && !ogTitle && !ogImage) return null;
  const p: Obj = found ?? {};
  const owners = Array.isArray(p.owners) ? p.owners.map((o) => (isObj(o) ? str(o.username) : "")).filter(Boolean) : [];
  const published = num(p.published_on) ?? num(p.publishedOn);
  const cover = bestSize(p.covers) ?? (ogImage || null);
  const images = imagesOf(Array.isArray(p.modules) ? p.modules : []);
  return {
    id: id || String(num(p.id) ?? ""),
    url,
    title: (str(p.name) || ogTitle.replace(/\s+(on|\|)\s+Behance\s*$/i, "")).slice(0, 120),
    description: plainText(str(p.description) || ogDesc).slice(0, 4000),
    cover,
    images: images.length ? images : cover ? [{ url: cover, width: null, height: null }] : [],
    fields: names(p.fields),
    tags: names(p.tags),
    publishedAt: published ? new Date(published * 1000) : null,
    owners,
  };
}

const httpLinks = (text: string) => Array.from(new Set(text.match(/https?:\/\/[^\s"'<>)]+/g) ?? []));

/** A profile page: display name, website, bio, avatar, fields, and every link on it. */
export function parseProfilePage(html: string, username: string): BehanceProfile | null {
  const wanted = username.toLowerCase();
  let owner: Obj | null = null;
  const blobs = stateBlobs(html);
  for (const blob of blobs) {
    walk(blob, (o) => {
      if (str(o.username).toLowerCase() === wanted && (typeof o.display_name === "string" || typeof o.displayName === "string" || typeof o.first_name === "string")) {
        owner = o;
        return true;
      }
    });
    if (owner) break;
  }
  const ogTitle = meta(html, "og:title");
  if (!owner && !ogTitle) return null;
  const o: Obj = owner ?? {};
  const images = isObj(o.images) ? bestSize(o.images) : null;
  const bio = str(o.about) || str(o.bio) || str(o.description) || meta(html, "og:description") || "";
  // Links live in several shapes over the years; the plain text of the state catches them all.
  const links = httpLinks(JSON.stringify(blobs)).filter((l) => !/behance\.net|adobe\.com|typekit|cloudfront|amazonaws|googleapis|gstatic/i.test(l));
  const website = str(o.website) || links.find((l) => !/instagram|facebook|twitter|x\.com|linkedin|tiktok|youtube|dribbble|vimeo|pinterest/i.test(l)) || null;
  return {
    username,
    displayName: (str(o.display_name) || str(o.displayName) || [str(o.first_name), str(o.last_name)].filter(Boolean).join(" ") || ogTitle.replace(/\s+on\s+Behance\s*$/i, "")).slice(0, 120),
    url: profileUrl(username),
    website,
    bio: plainText(bio).slice(0, 2000) || null,
    avatar: images ?? (meta(html, "og:image") || null),
    fields: names(o.fields),
    links: [...new Set([website, ...links].filter((l): l is string => Boolean(l)))],
  };
}
