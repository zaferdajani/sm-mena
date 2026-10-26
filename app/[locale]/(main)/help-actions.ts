"use server";

import { and, desc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { helpAiEnabled, helpReply, type HelpReply } from "@/lib/ai/help-assistant";
import { getSessionUser } from "@/lib/auth/session";
import { supportRef } from "@/lib/data/bugs";
import { getDb } from "@/lib/db";
import { supportRequests } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { getVisitorId } from "@/lib/visitor";

// The help chat (docs/62). Conversation turns go to Claude when it is set up;
// otherwise the chat runs its guided mode in the browser. Filing a report uses
// the same action as the /support form (support-actions.ts).

const history = z
  .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1500) }))
  .min(1)
  .max(16);

export type HelpTurnResult = { mode: "ai"; reply: HelpReply } | { mode: "guided" } | { mode: "limited" };

export async function helpChatAction(turns: unknown, page: unknown): Promise<HelpTurnResult> {
  if (!helpAiEnabled()) return { mode: "guided" };
  const parsed = history.safeParse(turns);
  if (!parsed.success) return { mode: "guided" };
  const who = (await getVisitorId()) ?? (await clientIp());
  if (!rateLimit(`help:${who}`, 30, 10 * 60 * 1000)) return { mode: "limited" };
  const from = typeof page === "string" && page.startsWith("/") ? page.split(/[?#]/)[0].slice(0, 200) : null;
  const reply = await helpReply(parsed.data, from);
  return reply ? { mode: "ai", reply } : { mode: "guided" };
}

export type ReportStatus = { ref: string; status: "new" | "planned" | "done" | "declined"; handledAt: string | null };

/** Status of the reports this browser or account sent, by report number. Others' reports are never returned. */
export async function reportStatusAction(refs: unknown): Promise<ReportStatus[]> {
  const wanted = z.array(z.string().regex(/^[A-F0-9]{8}$/)).max(10).safeParse(refs);
  if (!wanted.success || !wanted.data.length) return [];
  const [visitorId, user] = await Promise.all([getVisitorId(), getSessionUser()]);
  const mine = [visitorId ? eq(supportRequests.visitorId, visitorId) : undefined, user ? eq(supportRequests.userId, user.id) : undefined].filter((c) => c !== undefined);
  if (!mine.length) return [];
  const db = await getDb();
  const rows = await db
    .select({ id: supportRequests.id, status: supportRequests.status, handledAt: supportRequests.handledAt })
    .from(supportRequests)
    .where(and(or(...mine)))
    .orderBy(desc(supportRequests.createdAt))
    .limit(50);
  return rows
    .filter((r) => wanted.data.includes(supportRef(r.id)))
    .map((r) => ({ ref: supportRef(r.id), status: r.status, handledAt: r.handledAt?.toISOString() ?? null }));
}
