import { json, requireApiAgency, route } from "@/lib/api/v1";
import { listNotifications, unreadNotificationCount } from "@/lib/data/notifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/notifications → { unread, items }. The studio's latest 50 notifications, newest first, with only
 * the fields a client needs to show and open an item.
 */
export const GET = route(async (request) => {
  const found = await requireApiAgency(request);
  if (found instanceof Response) return found;
  const recipient = { agencyId: found.agency.id };
  const [items, unread] = await Promise.all([listNotifications(recipient, 50), unreadNotificationCount(recipient)]);
  return json({
    unread,
    items: items.map((n) => ({
      id: n.id,
      kind: n.kind,
      href: n.href,
      params: n.params,
      conversationId: n.conversationId,
      requestId: n.requestId,
      read: n.readAt !== null,
      createdAt: n.createdAt,
    })),
  });
});
