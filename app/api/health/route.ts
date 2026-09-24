import { sql } from "drizzle-orm";
import { aiStatus } from "@/lib/ai/agent";
import { getDb } from "@/lib/db";
import { googleConfigured } from "@/lib/google";
import { monetizationEnabled } from "@/lib/monetization/plans";

export const dynamic = "force-dynamic";

// Health check for Fly.io / uptime monitors. Reports configuration flags only,
// never secrets.
export async function GET() {
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      database: process.env.DATABASE_URL ? "postgres" : "pglite",
      storage: process.env.STORAGE_PROVIDER === "supabase" ? "supabase" : "local",
      ai: aiStatus(),
      google: googleConfigured(),
      monetization: monetizationEnabled(),
    });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
