import { getSessionUser } from "@/lib/auth/session";
import { adminMfaRequired } from "@/lib/auth/mfa";
import { authorizeStaff } from "@/lib/core/rules/auth/authorize";
import { isSafeKey, storage } from "@/lib/storage";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff" };

/** Screenshots attached to problem reports (docs/61): private storage, staff with support.manage only. */
export async function GET(_: Request, { params }: RouteContext<"/api/support-media/[...key]">) {
  const key = (await params).key.join("/");
  const allowed = authorizeStaff(await getSessionUser(), adminMfaRequired(), "support.manage", { allowEnroll: false }).ok;
  if (!allowed || !/^support\/[a-f0-9-]{36}\.webp$/.test(key) || !isSafeKey(key)) return new Response("Not found", { status: 404, headers: privateHeaders });
  const body = await storage().get(key);
  if (!body) return new Response("Not found", { status: 404, headers: privateHeaders });
  return new Response(new Uint8Array(body), { headers: { ...privateHeaders, "Content-Type": "image/webp" } });
}
