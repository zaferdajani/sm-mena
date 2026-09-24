import { currentRecipient } from "@/lib/chat-access";
import { unreadNotificationCount } from "@/lib/data/notifications";

// The bell polls this about once a minute.
export const dynamic = "force-dynamic";

export async function GET() {
  const current = await currentRecipient();
  const count = current ? await unreadNotificationCount(current.recipient) : 0;
  return Response.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
