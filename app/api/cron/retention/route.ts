import { purgeOldMessages } from "@/lib/data/conversations";
import { runMilestoneJobs } from "@/lib/data/contract-jobs";
import { purgeOldNotifications } from "@/lib/data/notifications";
import { expireNeeds } from "@/lib/data/collab-needs";
import { expireInquiries } from "@/lib/data/collab-inquiries";
import { expireHolds } from "@/lib/data/capacity";
import { sendCollabReminders } from "@/lib/data/collab-next";
import { purgeAssistantUsage } from "@/lib/data/collab-ai-usage";
import { featureOnGlobally } from "@/lib/features";
import { purgeSocial } from "@/lib/data/social";
import { purgeSetupMedia } from "@/lib/data/portfolio-setup";

// The daily job (vercel.json; one cron keeps us within the Hobby plan's limit):
// retention (docs/08-legal-compliance.md): chat messages after 24 months,
// notifications after 90 days; then the milestone jobs (docs/14): review
// reminders, deemed acceptance and closed appeal windows. Protected by CRON_SECRET.
export const dynamic = "force-dynamic";
// The reminder job reads per active agency; give the invocation room (Vercel functions default to 10 s on Hobby).
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const [messages, notifications] = await Promise.all([purgeOldMessages(), purgeOldNotifications()]);
  const milestones = await runMilestoneJobs();
  // Collaboration V2 (docs/48): published needs and work inquiries past their dates close for everyone.
  const [needs, inquiries, holds] = await Promise.all([expireNeeds(), expireInquiries(), expireHolds()]);
  // R3 (docs/50): one deduplicated reminder per open collaboration item and day, after quiet hours.
  const reminders = (await featureOnGlobally("collaboration_intelligence")) ? await sendCollabReminders() : 0;
  // Assistant-budget rows older than the retention window (docs/50): today's row is all the budget reads.
  const assistantUsage = await purgeAssistantUsage();
  // Platform connections and setup drafts (docs/53): expired attempts, unpicked items, 30-day metadata, 60-day staged images.
  const [social, setupMedia] = await Promise.all([purgeSocial(), purgeSetupMedia()]);
  return Response.json({ messages, notifications, milestones, needs, inquiries, holds, reminders, assistantUsage, social, setupMedia });
}
