import { sql } from "drizzle-orm";
import { aiStatus } from "@/lib/ai/agent";
import { getDb } from "@/lib/db";
import { googleConfigured } from "@/lib/google";
import { monetizationEnabled } from "@/lib/monetization/plans";
import { storageHealth } from "@/lib/storage/health";

export const dynamic = "force-dynamic";

/** The configuration detail is for the team, not the public: it names the database, storage and AI providers. */
function canSeeDetail(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}

// Health check for uptime monitors. Anyone gets { ok }; with the cron secret it also reports the
// configuration flags (never secrets). Storage that cannot keep photos (lib/storage/health.ts) fails the check too.
export async function GET(request: Request) {
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    const { ready: storageReady, label: storage } = storageHealth();
    const status = storageReady ? 200 : 503;
    if (!canSeeDetail(request)) return Response.json({ ok: storageReady }, { status });
    return Response.json({
      ok: storageReady,
      database: process.env.DATABASE_URL ? "postgres" : "pglite",
      storage,
      ai: aiStatus(),
      google: googleConfigured(),
      monetization: monetizationEnabled(),
      email: Boolean(process.env.RESEND_API_KEY),
    }, { status });
  } catch (error) {
    console.error("health check failed:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false }, { status: 503 });
  }
}
