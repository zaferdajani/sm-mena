import { z } from "zod";
import { invalidBody, json, readJson, requireApiAgency, route } from "@/lib/api/v1";
import { markNotificationsRead, unreadNotificationCount } from "@/lib/data/notifications";

export const dynamic = "force-dynamic";

const schema = z.object({ ids: z.array(z.number().int().positive()).max(200).optional() });

/** POST /api/v1/notifications/read { ids? } → { unread }. Without ids, marks everything read. */
export const POST = route(async (request) => {
  const found = await requireApiAgency(request);
  if (found instanceof Response) return found;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error);
  const recipient = { agencyId: found.agency.id };
  await markNotificationsRead(recipient, parsed.data.ids);
  return json({ unread: await unreadNotificationCount(recipient) });
});
