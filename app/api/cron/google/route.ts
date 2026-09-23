import { refreshAllGoogleRatings } from "@/lib/google";

// Vercel Cron (see vercel.json). Protected by CRON_SECRET.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const updated = await refreshAllGoogleRatings();
  return Response.json({ updated });
}
