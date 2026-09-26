import { AlarmClock, BadgeCheck, BellRing, FileSignature, FileText, Gavel, Handshake, Inbox, MessagesSquare, PackageCheck, RotateCcw, ShieldCheck, Star, XCircle, type LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { NOTIFICATION_KINDS, type NotificationKind } from "@/lib/chat";
import type { Notification } from "@/lib/db/schema";
import { formatDate, timeAgo } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationKind, LucideIcon> = {
  message: MessagesSquare,
  proposal_received: FileText,
  proposal_accepted: BadgeCheck,
  proposal_declined: XCircle,
  request_invited: BellRing,
  inquiry: Inbox,
  partner_request: Handshake,
  partner_accepted: Handshake,
  share_proposed: Handshake,
  share_accepted: Handshake,
  share_declined: XCircle,
  share_submitted: PackageCheck,
  contract_signed: FileSignature,
  contract_funded: ShieldCheck,
  milestone_submitted: PackageCheck,
  milestone_changes: RotateCcw,
  milestone_approved: BadgeCheck,
  milestone_auto_approved: BadgeCheck,
  review_reminder: AlarmClock,
  extra_round_asked: RotateCcw,
  extra_round_granted: RotateCcw,
  dispute_opened: Gavel,
  dispute_evidence: Gavel,
  dispute_decided: Gavel,
  dispute_appealed: Gavel,
  dispute_final: Gavel,
  cancel_proposed: XCircle,
  cancel_accepted: XCircle,
  cancel_declined: XCircle,
  contract_request: FileText,
  contract_received: FileSignature,
  contract_completed: BadgeCheck,
  review_invite: Star,
};

const isKind = (kind: string): kind is NotificationKind => (NOTIFICATION_KINDS as readonly string[]).includes(kind);

/** Notification rows; the text is written in the reader's language from kind + params. */
export async function NotificationList({ rows, empty }: { rows: Notification[]; empty: string }) {
  const t = await getTranslations("Notifications");
  const locale = await getLocale();
  const shown = rows.filter((n) => isKind(n.kind));
  if (!shown.length) return <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y overflow-hidden rounded-xl border" data-testid="notifications">
      {shown.map((n) => {
        const kind = n.kind as NotificationKind;
        const Icon = ICONS[kind];
        const params = n.params ?? {};
        const values = {
          name: String(params.name ?? ""),
          title: String(params.title ?? ""),
          milestone: String(params.milestone ?? ""),
          date: params.date ? formatDate(new Date(String(params.date)), locale) : "",
          days: Number(params.days ?? 0),
          count: Number(params.count ?? 1),
          services: String(params.services ?? "")
            .split(",")
            .filter(Boolean)
            .map((s) => serviceLabel(s, locale))
            .join(" · "),
        };
        return (
          <li key={n.id}>
            <Link href={n.href} className={cn("flex items-start gap-3 p-3 hover:bg-muted", !n.readAt && "bg-brand/5")} data-testid="notification" data-kind={kind} data-unread={n.readAt ? undefined : "true"}>
              <span className={cn("mt-0.5 rounded-full p-2", kind === "proposal_accepted" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm", !n.readAt && "font-semibold")} dir="auto">
                  {t(`kinds.${kind}`, values)}
                </span>
                <span suppressHydrationWarning className="text-xs text-muted-foreground">{timeAgo(n.createdAt.toISOString(), locale)}</span>
              </span>
              {!n.readAt && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-brand" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
