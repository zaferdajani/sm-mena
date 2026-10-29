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
    <div className="mx-auto w-full min-w-0 max-w-[68rem] space-y-6 px-4 py-6 sm:px-6 sm:py-8" data-design-surface="notifications">
      <header className="rounded-xl border bg-card p-5 sm:p-6">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("visitorIntro")}</p>
      </header>
      <NotificationList rows={rows} empty={t("empty")} />
    </div>
  );
}
