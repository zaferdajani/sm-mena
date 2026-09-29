import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { mayReadAgencyId, publicationFor } from "@/lib/data/publication";
import { launchViewer } from "@/lib/launch-access";
import { isRegistrationPhase } from "@/lib/launch-phase";
import { isSafeKey, storage } from "@/lib/storage";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff" };
const publicHeaders = { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" };

/**
 * Media in the PRIVATE bucket, checked on every read (docs/53, docs/54):
 * - drafts/… (first-run setup): the owner of that agency or staff only, whatever the page's visibility;
 * - posts/avatars/clients: whoever may read the agency's page; when that page is public outside the
 *   registration phase the response is cacheable, otherwise it is private and never stored.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/portfolio-media/[...key]">) {
  const parts = (await params).key;
  const key = parts.join("/");
  const match = /^portfolio\/([a-f0-9-]{36})\/(posts|avatars|clients|drafts)\/[a-f0-9-]+(?:-t)?\.(webp|png|jpg)$/.exec(key);
  if (!match || !isSafeKey(key)) return new Response("Not found", { status: 404, headers: privateHeaders });
  const [agencyId, segment, ext] = [match[1], match[2], match[3]];
  let headers: Record<string, string> = privateHeaders;
  if (segment === "drafts") {
    const who = await launchViewer();
    const db = await getDb();
    const [a] = await db.select({ ownerUserId: agencies.ownerUserId }).from(agencies).where(eq(agencies.id, agencyId));
    if (!a || !(who.staff || (who.userId !== null && who.userId === a.ownerUserId))) return new Response("Not found", { status: 404, headers: privateHeaders });
  } else {
    if (!(await mayReadAgencyId(agencyId))) return new Response("Not found", { status: 404, headers: privateHeaders });
    const pub = await publicationFor(agencyId);
    if (!isRegistrationPhase() && pub.visibility === "public") headers = publicHeaders;
  }
  const body = await storage().get(key);
  if (!body) return new Response("Not found", { status: 404, headers: privateHeaders });
  const type = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  return new Response(new Uint8Array(body), { headers: { ...headers, "Content-Type": type } });
}
