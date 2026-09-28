import { purgeOldMessages } from "@/lib/data/conversations";
import { runMilestoneJobs } from "@/lib/data/contract-jobs";
import { purgeOldNotifications } from "@/lib/data/notifications";
import { expireNeeds } from "@/lib/data/collab-needs";
import { expireInquiries } from "@/lib/data/collab-inquiries";
import { expireHolds } from "@/lib/data/capacity";

// The daily job (vercel.json; one cron keeps us within the Hobby plan's limit):
// retention (docs/08-legal-compliance.md): chat messages after 24 months,
// notifications after 90 days; then the milestone jobs (docs/14): review
// reminders, deemed acceptance and closed appeal windows. Protected by CRON_SECRET.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const [messages, notifications] = await Promise.all([purgeOldMessages(), purgeOldNotifications()]);
  const milestones = await runMilestoneJobs();
  // Collaboration V2 (docs/48): published needs and work inquiries past their dates close for everyone.
  const [needs, inquiries, holds] = await Promise.all([expireNeeds(), expireInquiries(), expireHolds()]);
  return Response.json({ messages, notifications, milestones, needs, inquiries, holds });
}
