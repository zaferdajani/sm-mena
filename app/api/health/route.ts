import { sql } from "drizzle-orm";
import { aiStatus } from "@/lib/ai/agent";
import { getDb } from "@/lib/db";
import { googleConfigured } from "@/lib/google";
import { monetizationEnabled } from "@/lib/monetization/plans";

export const dynamic = "force-dynamic";

// Health check for uptime monitors. Reports configuration flags only, never
// secrets. Storage without its keys fails every page that shows a photo, so it
// makes the check fail too.
export async function GET() {
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    const supabase = process.env.STORAGE_PROVIDER === "supabase";
    const storageReady = !supabase || Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    return Response.json({
      ok: storageReady,
      database: process.env.DATABASE_URL ? "postgres" : "pglite",
      storage: supabase ? (storageReady ? "supabase" : "supabase (keys missing)") : "local",
      ai: aiStatus(),
      google: googleConfigured(),
      monetization: monetizationEnabled(),
    }, { status: storageReady ? 200 : 503 });
  } catch (error) {
    console.error("health check failed:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false }, { status: 503 });
  }
}
