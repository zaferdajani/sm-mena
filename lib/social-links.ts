/**
 * Accounts an agency runs for a client (portfolio clients, docs/28). The
 * agency types a handle ("@nakhla.cafe") or pastes a link; we keep what they
 * typed and build the public address from it.
 */

export const LINK_KINDS = ["instagram", "tiktok", "facebook", "youtube", "x", "snapchat", "linkedin", "website", "google_maps", "other"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const isLinkKind = (v: unknown): v is LinkKind => typeof v === "string" && (LINK_KINDS as readonly string[]).includes(v);

/** Profile address for a handle on each network. */
const PROFILE: Partial<Record<LinkKind, (handle: string) => string>> = {
  instagram: (h) => `https://www.instagram.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  x: (h) => `https://x.com/${h}`,
  snapchat: (h) => `https://www.snapchat.com/add/${h}`,
  linkedin: (h) => `https://www.linkedin.com/company/${h}`,
};

/** Hosts a pasted link may use for each network (anything else is refused for that network). */
const HOSTS: Partial<Record<LinkKind, string[]>> = {
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  facebook: ["facebook.com", "fb.com", "fb.me"],
  youtube: ["youtube.com", "youtu.be"],
  x: ["x.com", "twitter.com"],
  snapchat: ["snapchat.com"],
  linkedin: ["linkedin.com"],
  google_maps: ["google.com", "goo.gl", "maps.app.goo.gl", "g.page"],
};

const hostMatches = (host: string, allowed: string[]) => allowed.some((a) => host === a || host.endsWith(`.${a}`));

/** The network a pasted link belongs to, from its host; null for an unknown site. */
export function kindOfUrl(url: string): LinkKind | null {
  const parsed = asUrl(url);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  for (const [kind, hosts] of Object.entries(HOSTS) as [LinkKind, string[]][]) if (hostMatches(host, hosts)) return kind;
  return null;
}

/** The handle inside a profile link ("instagram.com/rose.cafe/" → "rose.cafe"), or null when the link has none. */
export function handleOfUrl(url: string): string | null {
  const parsed = asUrl(url);
  if (!parsed) return null;
  const first = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
  const handle = decodeURIComponent(first).replace(/^@/, "");
  return /^[\p{L}\p{N}._-]{1,60}$/u.test(handle) ? handle : null;
}

function asUrl(value: string): URL | null {
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : /^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(value) ? `https://${value}` : null;
  if (!withScheme) return null;
  try {
    const u = new URL(withScheme);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

/**
 * Cleans what the agency typed. Returns the value to store, or null when it
 * can't be an account of that kind. Handles are kept without "@"; links are
 * kept as full https addresses.
 */
export function cleanLinkValue(kind: LinkKind, raw: string): string | null {
  const value = raw.trim().slice(0, 300);
  if (!value) return null;
  const handleLike = /^@?[\p{L}\p{N}._-]{1,60}$/u.test(value) && !(kind === "website" && value.includes("."));
  if (PROFILE[kind] && handleLike) return value.replace(/^@/, "");
  const url = asUrl(value);
  if (!url) return null;
  const allowed = HOSTS[kind];
  if (allowed && !hostMatches(url.hostname.toLowerCase().replace(/^www\./, ""), allowed)) return null;
  url.protocol = "https:";
  return url.toString();
}

/** Public address for a stored value. */
export function linkHref(kind: LinkKind, value: string): string | null {
  if (/^https?:\/\//i.test(value)) return value;
  const build = PROFILE[kind];
  return build ? build(value) : null;
}

/** Short text to show on the chip: "@handle", or the link without https://www. */
export function linkLabel(kind: LinkKind, value: string): string {
  if (!/^https?:\/\//i.test(value)) return PROFILE[kind] ? `@${value}` : value;
  const u = asUrl(value);
  if (!u) return value;
  const path = u.pathname.replace(/\/$/, "");
  const handle = PROFILE[kind] && path.split("/").filter(Boolean).pop();
  if (handle && kind !== "website") return handle.startsWith("@") ? handle : `@${handle}`;
  return `${u.hostname.replace(/^www\./, "")}${path}`.slice(0, 60);
}

export type CleanLink = { kind: LinkKind; value: string };

/** Cleans a list of rows from the form: drops empty ones, reports the first bad one. */
export function cleanLinks(rows: { kind: string; value: string }[], max = 20): { links: CleanLink[] } | { error: number } {
  const links: CleanLink[] = [];
  for (const [i, row] of rows.entries()) {
    if (!row.value?.trim()) continue;
    if (!isLinkKind(row.kind)) return { error: i };
    const value = cleanLinkValue(row.kind, row.value);
    if (!value) return { error: i };
    if (!links.some((l) => l.kind === row.kind && l.value === value)) links.push({ kind: row.kind, value });
  }
  return { links: links.slice(0, max) };
}
