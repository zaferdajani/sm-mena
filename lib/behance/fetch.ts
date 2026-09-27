import { readFile } from "node:fs/promises";
import path from "node:path";
import { BEHANCE_LIMITS, isBehanceHost } from "./types";

export { isBehanceHost };

// Every byte from Behance passes through here: one place for the host
// allow-list (no request ever leaves behance.net), the size ceilings and the
// timeout. Tests point BEHANCE_FIXTURES at a folder and no network is used.

export type Fetched = { status: number; url: string; type: string; body: Buffer };
export type Fetcher = (url: string, opts: { accept: string; maxBytes: number }) => Promise<Fetched | null>;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 SawwiqImport/1.0 (+https://sawwiq.org)";

export function assertBehanceUrl(raw: string): URL {
  const u = new URL(raw);
  if (u.protocol !== "https:" || !isBehanceHost(u.hostname)) throw new Error("not-behance");
  return u;
}

/** Reads at most `maxBytes`; a longer body is cut off, so a page can never exhaust the function's memory. */
async function readCapped(res: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error("too-large");
  if (!res.body) return Buffer.from(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error("too-large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export const httpFetcher: Fetcher = async (url, { accept, maxBytes }) => {
  assertBehanceUrl(url);
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept, "accept-language": "en,ar;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(BEHANCE_LIMITS.timeoutMs),
  });
  // A redirect may only land on Behance too.
  if (!isBehanceHost(new URL(res.url).hostname)) throw new Error("not-behance");
  const body = await readCapped(res, maxBytes);
  return { status: res.status, url: res.url, type: res.headers.get("content-type") ?? "", body };
};

/**
 * Serves Behance's shapes from a folder (tests/fixtures/behance):
 *   /feeds/user?username=X      → feed-X.xml
 *   /X                          → profile-X.html
 *   /gallery/ID/slug            → project-ID.html
 *   image URLs                  → images/<basename>
 */
export function fixtureFetcher(dir: string): Fetcher {
  return async (url) => {
    const u = assertBehanceUrl(url);
    let file: string;
    if (u.pathname === "/feeds/user") file = `feed-${u.searchParams.get("username") ?? ""}.xml`;
    else if (/^\/gallery\/(\d+)\//.test(u.pathname)) file = `project-${u.pathname.split("/")[2]}.html`;
    else if (/^\/[^/]+\/?$/.test(u.pathname) && u.hostname === "www.behance.net") file = `profile-${u.pathname.replace(/\//g, "")}.html`;
    else file = path.join("images", path.basename(u.pathname));
    try {
      const body = await readFile(path.join(dir, file));
      const type = file.endsWith(".xml") ? "application/rss+xml" : file.endsWith(".html") ? "text/html" : "image/webp";
      return { status: 200, url, type, body };
    } catch {
      return { status: 404, url, type: "text/plain", body: Buffer.alloc(0) };
    }
  };
}

/** The real network, unless BEHANCE_FIXTURES names a folder of saved pages (tests). */
export function defaultFetcher(): Fetcher {
  const dir = process.env.BEHANCE_FIXTURES?.trim();
  return dir ? fixtureFetcher(path.resolve(dir)) : httpFetcher;
}
