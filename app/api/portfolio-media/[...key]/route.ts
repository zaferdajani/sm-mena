import { mayReadAgencyId } from "@/lib/data/publication";
import { isSafeKey, storage } from "@/lib/storage";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff" };
/** New draft media is in a PRIVATE bucket, not a hidden public URL. Check access on every read. */
export async function GET(_request: Request, { params }: RouteContext<"/api/portfolio-media/[...key]">) {
  const parts = (await params).key;
  const key = parts.join("/");
  const match = /^portfolio\/([a-f0-9-]{36})\/(?:posts|avatars|clients|drafts)\/[a-f0-9-]+(?:-t)?\.(webp|png|jpg)$/.exec(key);
  if (!match || !isSafeKey(key) || !(await mayReadAgencyId(match[1]))) return new Response("Not found", { status: 404, headers: privateHeaders });
  const body = await storage().get(key);
  if (!body) return new Response("Not found", { status: 404, headers: privateHeaders });
  const type = match[2] === "jpg" ? "image/jpeg" : `image/${match[2]}`;
  return new Response(new Uint8Array(body), { headers: { ...privateHeaders, "Content-Type": type } });
}
