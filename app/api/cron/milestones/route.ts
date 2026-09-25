import { runMilestoneJobs } from "@/lib/data/contract-jobs";

// Milestone jobs on demand (the daily run happens in /api/cron/retention; the
// job catches up on everything overdue): review reminders, deemed acceptance
// after the review period, and dispute decisions whose appeal window closed.
// Idempotent. Protected by CRON_SECRET.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runMilestoneJobs());
}
