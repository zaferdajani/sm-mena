"use server";

import { z } from "zod";
import { helpAiEnabled, helpReply, type HelpReply } from "@/lib/ai/help-assistant";
import { getSessionUser } from "@/lib/auth/session";
import { reportsForViewer, type ThreadSummary } from "@/lib/data/support-threads";
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

/** The reports this browser or account sent, with their private conversation links (docs/63). Nobody else's. */
export async function myReportsAction(): Promise<ThreadSummary[]> {
  const [visitorId, user] = await Promise.all([getVisitorId(), getSessionUser()]);
  return reportsForViewer(visitorId, user?.id ?? null, 10);
}
