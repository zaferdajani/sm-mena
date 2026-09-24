import { getLocale, getTranslations } from "next-intl/server";
import { AgencyAvatar } from "@/components/agency-avatar";
import { Link } from "@/i18n/navigation";
import type { ChatSide } from "@/lib/chat";
import type { ConversationRow } from "@/lib/data/conversations";
import { timeAgo } from "@/lib/format";
import { mediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

/** WhatsApp-style list of threads, newest first, unread ones in bold with a dot. */
export async function ConversationList({ rows, side, empty }: { rows: ConversationRow[]; side: ChatSide; empty: string }) {
  const t = await getTranslations("Chat");
  const locale = await getLocale();
  if (!rows.length) return <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y overflow-hidden rounded-xl border" data-testid="conversations">
      {rows.map(({ conversation: c, agency, preview, lastSide, unread }) => {
        const name = side === "agency" ? c.clientName : agency.name;
        const href = side === "agency" ? `/studio/messages/${c.id}` : `/chats/${c.id}`;
        return (
          <li key={c.id}>
            <Link href={href} className="flex items-center gap-3 p-3 hover:bg-muted" data-testid="conversation" data-unread={unread ? "true" : undefined}>
              <AgencyAvatar name={name} src={side === "agency" ? null : mediaUrl(agency.avatarKey)} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn("truncate", unread ? "font-bold" : "font-medium")} dir="auto">{name}</p>
                  {c.lastMessageAt && <span className={cn("shrink-0 text-[11px]", unread ? "font-semibold text-brand" : "text-muted-foreground")}>{timeAgo(c.lastMessageAt.toISOString(), locale)}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")} dir="auto">
                    {lastSide === side && <span className="text-muted-foreground">{t("you")}: </span>}
                    {preview ?? t("hidden")}
                  </p>
                  {unread && <span className="size-2.5 shrink-0 rounded-full bg-brand" aria-label={t("unread")} />}
                </div>
                {side === "agency" && c.inquiryId && <p className="text-[11px] text-muted-foreground">{t("fromInquiry")}</p>}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
