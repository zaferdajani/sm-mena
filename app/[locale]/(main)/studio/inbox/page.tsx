import { MessageCircle, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArchiveButton } from "@/components/studio/inbox-actions";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { listInquiries, markAllRead } from "@/lib/data/inbox";
import { timeAgo } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { whatsappLink } from "@/lib/text";
import { cn } from "@/lib/utils";

export default async function InboxPage({ params, searchParams }: PageProps<"/[locale]/studio/inbox">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const archived = (await searchParams).view === "archived";
  const { agency } = await requireAgency();
  const t = await getTranslations("Studio.inboxPage");
  const rows = await listInquiries(agency.id, archived);
  const unreadIds = new Set(rows.filter((r) => r.inquiry.status === "new").map((r) => r.inquiry.id));
  // Opening the inbox marks everything as read; the badge disappears on the next navigation.
  if (unreadIds.size) await markAllRead(agency.id);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link href={{ pathname: "/studio/inbox", query: archived ? {} : { view: "archived" } }} className="text-xs text-brand">
          {archived ? t("showActive") : t("showArchived")}
        </Link>
      </div>
      {!rows.length && <p className="py-10 text-center text-sm text-muted-foreground">{t("empty")}</p>}
      <ul className="space-y-3" data-testid="inbox">
        {rows.map(({ inquiry, postCaption }) => (
          <li key={inquiry.id} className={cn("rounded-xl border p-4", unreadIds.has(inquiry.id) && "border-primary bg-brand-soft")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {inquiry.name}
                  {inquiry.businessName && <span className="font-normal text-muted-foreground"> · {inquiry.businessName}</span>}
                  {unreadIds.has(inquiry.id) && <span className="ms-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{t("new")}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span dir="ltr">{inquiry.phone}</span> · {timeAgo(inquiry.createdAt.toISOString(), locale)}
                  {inquiry.service && ` · ${serviceLabel(inquiry.service, locale)}`}
                </p>
              </div>
              <ArchiveButton id={inquiry.id} archived={inquiry.status === "archived"} />
            </div>
            <p className="mt-2 whitespace-pre-line text-sm" dir="auto">{inquiry.message}</p>
            {postCaption && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{t("about")}: {postCaption}</p>}
            <div className="mt-3 flex gap-2">
              <a
                href={whatsappLink(inquiry.phone, t("replyMessage", { name: inquiry.name, agency: agency.name }))}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ className: "h-8 gap-1.5 bg-[#25D366] text-white hover:bg-[#1ebe5b]" })}
              >
                <MessageCircle className="size-4" />
                {t("reply")}
              </a>
              <a href={`tel:${inquiry.phone}`} className={buttonVariants({ variant: "outline", className: "h-8 gap-1.5" })}>
                <Phone className="size-4" />
                {t("call")}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
