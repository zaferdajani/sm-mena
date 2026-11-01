import { cache } from "react";
import { getSessionUser } from "@/lib/auth/session";
import { currentRecipient } from "@/lib/chat-access";
import { listNotifications, unreadNotificationCount } from "@/lib/data/notifications";
import { NotificationBell } from "./bell";

/** One lookup per request, shared by the phone header and the desktop sidebar. */
const bellState = cache(async () => {
  const [current, user] = await Promise.all([currentRecipient(), getSessionUser()]);
  const count = current ? await unreadNotificationCount(current.recipient).catch(() => 0) : 0;
  // A visitor with no account and nothing ever received gets no bell: it only opened an empty page.
  const show = Boolean(user) || count > 0 || (current ? (await listNotifications(current.recipient, 1).catch(() => [])).length > 0 : false);
  return { show, count, href: current?.kind === "agency" ? ("/studio/notifications" as const) : ("/notifications" as const) };
});

/** The bell for the signed-in agency, or for this device's client notifications. */
export async function HeaderBell({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const { show, count, href } = await bellState();
  if (!show) return null;
  return <NotificationBell initialCount={count} href={href} variant={variant} />;
}
