import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NotificationList } from "@/components/notifications/notification-list";
import { listNotifications, markNotificationsRead } from "@/lib/data/notifications";
import { getVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { robots: { index: false } };

/** A client's notifications on this device: new quotes and agency replies. */
export default async function VisitorNotificationsPage({ params }: PageProps<"/[locale]/notifications">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Notifications");
  const visitorId = await getVisitorId();
  const rows = visitorId ? await listNotifications({ visitorId }) : [];
  // Seen now; this view still shows which ones were new.
  if (visitorId && rows.some((n) => !n.readAt)) await markNotificationsRead({ visitorId });
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("visitorIntro")}</p>
      </div>
      <NotificationList rows={rows} empty={t("empty")} />
    </div>
  );
}
