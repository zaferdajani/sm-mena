import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { listConversationsForStaff } from "@/lib/data/conversations";
import { timeAgo } from "@/lib/format";

export default async function AdminConversations({ params, searchParams }: PageProps<"/[locale]/admin/conversations">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("conversations.view");
  const t = await getTranslations("Chat.admin");
  const agency = String((await searchParams).agency ?? "").trim().slice(0, 60);
  const rows = await listConversationsForStaff({ agency: agency || undefined });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      <form className="flex gap-2" role="search">
        <Input name="agency" defaultValue={agency} placeholder={t("filter")} aria-label={t("filter")} className="h-9" dir="ltr" />
        <Button type="submit" size="sm" className="h-9">{t("filterButton")}</Button>
        {agency && (
          <Link href="/admin/conversations" className="self-center text-xs text-muted-foreground hover:underline">
            {t("clear")}
          </Link>
        )}
      </form>
      {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>}
      <ul className="divide-y rounded-xl border" data-testid="admin-conversations">
        {rows.map(({ conversation: c, agency: a, messageCount, hiddenCount }) => (
          <li key={c.id}>
            <Link href={`/admin/conversations/${c.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  <span dir="auto">{a.name}</span> <span className="text-muted-foreground" dir="ltr">@{a.handle}</span> ↔ <span dir="auto">{c.clientName}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.requestId ? t("request") : c.inquiryId ? t("inquiry") : "—"} · {t("messages", { count: messageCount })}
                  {hiddenCount ? ` · ${t("hiddenCount", { count: hiddenCount })}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-end text-xs text-muted-foreground">
                <p>{t(`status.${c.status}`)}</p>
                {c.lastMessageAt && <p>{timeAgo(c.lastMessageAt.toISOString(), locale)}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
