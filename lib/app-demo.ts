// Apps in a portfolio (docs/37-app-demos.md): a post can carry the app it
// shows, with a "Try the app" link into the app mall's sandbox (the PCN
// platform, github.com/zaferdajani/app-mall), where a visitor runs the real
// app in an isolated frame without installing anything and without seeing
// its code. Only the app mall's hosts may be framed; the developer allows
// sawwiq.org on their embed key over there.

export const APP_KINDS = ["web", "ios", "android", "cross"] as const;
export type AppKind = (typeof APP_KINDS)[number];

export type PostApp = {
  name: string;
  kind: AppKind;
  /** The version this post shows ("2.1", "beta 3"); a post per version keeps the history. */
  version: string | null;
  /** The app mall's embed link (https://pcn.store/embed/<key>/), opened in the sandbox frame. */
  tryUrl: string | null;
  /** App Store / Google Play page. */
  storeUrl: string | null;
  /** The live web app, if public. */
  webUrl: string | null;
};

/** Hosts whose pages may be framed as a demo: the app mall (env `APP_MALL_HOSTS`, comma-separated, subdomains included). */
export function appMallHosts(): string[] {
  return (process.env.APP_MALL_HOSTS ?? "pcn.store,pcn-api.fly.dev")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

const hostAllowed = (host: string, allowed: string[]) => allowed.some((a) => host === a || host.endsWith(`.${a}`));

/** True when the link is an https page on the app mall (the only origin the sandbox frame will load). */
export function isTryUrlAllowed(url: string, hosts = appMallHosts()): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && hostAllowed(u.hostname.toLowerCase(), hosts);
  } catch {
    return false;
  }
}

const httpsUrl = (raw: string | null | undefined): string | null | false => {
  const v = (raw ?? "").trim().slice(0, 500);
  if (!v) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : false;
  } catch {
    return false;
  }
};

export type AppError = "appName" | "appTryUrl" | "appUrl";

/**
 * Cleans what the agency typed in the post form's App section. Empty means
 * the post carries no app; a name with bad links is an error, not a silent drop.
 */
export function cleanApp(raw: { name?: string | null; kind?: string | null; version?: string | null; tryUrl?: string | null; storeUrl?: string | null; webUrl?: string | null }): PostApp | null | { error: AppError } {
  const name = (raw.name ?? "").trim().slice(0, 80);
  const tryRaw = (raw.tryUrl ?? "").trim();
  const storeRaw = (raw.storeUrl ?? "").trim();
  const webRaw = (raw.webUrl ?? "").trim();
  if (!name && !tryRaw && !storeRaw && !webRaw) return null;
  if (name.length < 2) return { error: "appName" };
  const kind = (APP_KINDS as readonly string[]).includes(raw.kind ?? "") ? (raw.kind as AppKind) : "cross";
  const tryUrl = tryRaw ? (isTryUrlAllowed(tryRaw) ? new URL(tryRaw).toString() : false) : null;
  if (tryUrl === false) return { error: "appTryUrl" };
  const storeUrl = httpsUrl(storeRaw);
  const webUrl = httpsUrl(webRaw);
  if (storeUrl === false || webUrl === false) return { error: "appUrl" };
  return { name, kind, version: (raw.version ?? "").trim().slice(0, 40) || null, tryUrl, storeUrl, webUrl };
}
