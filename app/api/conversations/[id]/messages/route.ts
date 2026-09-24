import { resolveParticipant } from "@/lib/chat-access";
import { listMessages, markRead, otherLastReadId, toChatMessage } from "@/lib/data/conversations";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

// Chat polling (docs/23-chat-and-notifications.md): the thread asks for
// messages newer than the last one it has. Polling instead of sockets because
// the app runs on one auto-stopping machine or on serverless functions.
export const dynamic = "force-dynamic";

const cursor = (value: string | null) => {
  if (value === null || !/^\d{1,15}$/.test(value)) return undefined;
  return Number(value);
};

export async function GET(request: Request, ctx: RouteContext<"/api/conversations/[id]/messages">) {
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const side = url.searchParams.get("as") === "agency" ? "agency" : "client";
  if (!rateLimit(`chat-poll:${await clientIp()}`, 2000, 3600 * 1000)) return Response.json({ error: "rateLimited" }, { status: 429 });
  const participant = await resolveParticipant(id, side, url.searchParams.get("access"));
  if (!participant) return Response.json({ error: "forbidden" }, { status: 403 });

  const after = cursor(url.searchParams.get("after"));
  const before = cursor(url.searchParams.get("before"));
  const rows = await listMessages(participant.conversation.id, after !== undefined ? { afterId: after } : before !== undefined ? { beforeId: before } : {});
  const newest = rows.at(-1)?.id;
  // Reading newer messages moves this side's read cursor (loading older ones doesn't).
  if (newest !== undefined && before === undefined) await markRead(participant.conversation, side, newest);
  return Response.json(
    { messages: rows.map(toChatMessage), otherLastReadId: await otherLastReadId(participant.conversation.id, side), status: participant.conversation.status },
    { headers: { "Cache-Control": "no-store" } },
  );
}
