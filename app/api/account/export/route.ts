import { getSessionUser } from "@/lib/auth/session";
import { audit } from "@/lib/data/agencies";
import { buildDataExport } from "@/lib/data/data-export";
import { rateLimit } from "@/lib/rate-limit";

// "Download my data": the signed-in person's own data as JSON (PDPL / GDPR access and portability).
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`export:${user.id}`, 5, 60 * 60 * 1000)) return new Response("Too many requests", { status: 429 });
  const data = await buildDataExport(user.id);
  if (!data) return new Response("Not found", { status: 404 });
  await audit(user.id, "account.export", "user", user.id, {});
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="sawwiq-my-data.json"',
      "cache-control": "no-store",
    },
  });
}
