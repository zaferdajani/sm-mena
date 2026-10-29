import { sendSupportUpdates } from "@/lib/data/support-notify";
import { sendSupportReplies } from "@/lib/data/support-threads";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

// Sends the "being worked on" and "handled" emails that are due (docs/61).
// The bug agent writes statuses from GitHub Actions, where no email key is
// kept; the half-hourly site check (lib/db/site-check.ts) calls this so the
// site, which holds the key, sends them. Needs no secret: it only sends emails
// that are already due, each once, and says nothing about whom.
export const dynamic = "force-dynamic";

export async function POST() {
  if (!rateLimit(`support-updates:${await clientIp()}`, 6, 60 * 60 * 1000)) return new Response("Too many requests", { status: 429 });
  // Reply links first: a reply email stands in for the status email of the same report (docs/63).
  const replies = await sendSupportReplies();
  const sent = await sendSupportUpdates();
  return Response.json({ sent, replies });
}
