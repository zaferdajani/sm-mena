import { cache } from "react";
import { currentRecipient } from "@/lib/chat-access";
import { unreadNotificationCount } from "@/lib/data/notifications";
import { NotificationBell } from "./bell";

/** One lookup per request, shared by the phone header and the desktop sidebar. */
const bellState = cache(async () => {
  const current = await currentRecipient();
  const count = current ? await unreadNotificationCount(current.recipient).catch(() => 0) : 0;
  return { count, href: current?.kind === "agency" ? ("/studio/notifications" as const) : ("/notifications" as const) };
});

/** The bell for the signed-in agency, or for this device's client notifications. */
export async function HeaderBell({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const { count, href } = await bellState();
  return <NotificationBell initialCount={count} href={href} variant={variant} />;
}
