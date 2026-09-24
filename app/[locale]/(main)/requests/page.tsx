import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { unreadByRequest } from "@/lib/data/conversations";
import { listVisitorRequests } from "@/lib/data/requests";
import { timeAgo } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { getVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { robots: { index: false } };

export default async function MyRequestsPage({ params }: PageProps<"/[locale]/requests">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Requests");
  const visitorId = await getVisitorId();
  const rows = visitorId ? await listVisitorRequests(visitorId) : [];
  const tchat = await getTranslations("Chat");
  const unread = visitorId ? await unreadByRequest(visitorId, rows.map((r) => r.request.id)) : new Map<string, number>();
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("myRequests")}</h1>
        <div className="flex items-center gap-2">
          <Link href="/chats" className={buttonVariants({ size: "sm", variant: "outline" })}>{tchat("clientTitle")}</Link>
          <Link href="/match" className={buttonVariants({ size: "sm" })}>{t("newRequest")}</Link>
        </div>
      </div>
      {!rows.length && <p className="text-sm text-muted-foreground">{t("noRequests")}</p>}
      <ul className="divide-y rounded-xl border">
        {rows.map(({ request, proposals }) => (
          <li key={request.id}>
            <Link href={`/requests/${request.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted">
              <div className="min-w-0">
                <p className="truncate font-medium">{request.services.map((s) => serviceLabel(s, locale)).join(" · ")}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(request.createdAt.toISOString(), locale)} · {t(`status.${request.status}`)}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5">
                {unread.get(request.id) ? (
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-white" title={tchat("unread")} data-testid="request-unread">
                    {unread.get(request.id)}
                  </span>
                ) : null}
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{t("proposals", { count: proposals })}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
