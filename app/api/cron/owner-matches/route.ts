import { NextResponse } from "next/server";
import { computeOwnerMatches, sendOwnerMatchEmails } from "@/lib/data/owner-matching";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily owner ↔ provider matching (docs/59): recompute suggestions for every registered business owner and,
// once discovery is open (or OWNER_MATCH_EMAILS=on), send each owner with new suggestions one email.
// Protected by CRON_SECRET like the other crons.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const computed = await computeOwnerMatches();
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://sawwiq.org").replace(/\/$/, "");
  const sent = await sendOwnerMatchEmails(site);
  return NextResponse.json({ ok: true, computed: { owners: computed.owners, matched: computed.matched, suggestions: computed.suggestions, batchId: computed.batchId }, sent });
}
