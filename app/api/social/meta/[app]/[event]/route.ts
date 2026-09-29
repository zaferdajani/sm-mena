import { verifySignedRequest } from "@/lib/social/meta";
import { recordDeletionRequest, revokeBySubject } from "@/lib/data/social";
import { SITE_URL } from "@/lib/site";

// Meta's deauthorize and data-deletion callbacks (docs/53), one per app:
//   /api/social/meta/{instagram|facebook}/{deauthorize|delete}
// Registered in each Meta app's settings. A verified request removes that
// person's connections in every agency; the deletion callback answers with a
// status link and confirmation code, as Meta requires.
export const dynamic = "force-dynamic";

const SECRETS = { instagram: "INSTAGRAM_APP_SECRET", facebook: "FACEBOOK_APP_SECRET" } as const;

export async function POST(request: Request, { params }: { params: Promise<{ app: string; event: string }> }) {
  const { app, event } = await params;
  if ((app !== "instagram" && app !== "facebook") || (event !== "deauthorize" && event !== "delete")) return new Response("Not found", { status: 404 });
  const secret = process.env[SECRETS[app]];
  if (!secret) return new Response("Not configured", { status: 404 });
  const form = await request.formData().catch(() => null);
  const subject = verifySignedRequest(String(form?.get("signed_request") ?? ""), secret);
  if (!subject) return new Response("Bad request", { status: 400 });
  const removed = await revokeBySubject(app, subject);
  if (event === "deauthorize") return Response.json({ ok: true });
  const code = await recordDeletionRequest(app, removed);
  return Response.json({ url: `${SITE_URL}/ar/social-deletion/${code}`, confirmation_code: code });
}
