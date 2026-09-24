import { purgeOldMessages } from "@/lib/data/conversations";
import { purgeOldNotifications } from "@/lib/data/notifications";

// Retention (docs/08-legal-compliance.md): chat messages after 24 months,
// notifications after 90 days. Vercel Cron (vercel.json); protected by CRON_SECRET.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const [messages, notifications] = await Promise.all([purgeOldMessages(), purgeOldNotifications()]);
  return Response.json({ messages, notifications });
}
