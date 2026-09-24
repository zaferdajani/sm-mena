import { getTranslations, setRequestLocale } from "next-intl/server";
import { NotificationList } from "@/components/notifications/notification-list";
import { requireAgency } from "@/lib/auth/guards";
import { listNotifications, markNotificationsRead } from "@/lib/data/notifications";

export default async function StudioNotificationsPage({ params }: PageProps<"/[locale]/studio/notifications">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Notifications");
  const rows = await listNotifications({ agencyId: agency.id });
  // Seen now; this view still shows which ones were new.
  if (rows.some((n) => !n.readAt)) await markNotificationsRead({ agencyId: agency.id });
  return <NotificationList rows={rows} empty={t("empty")} />;
}
