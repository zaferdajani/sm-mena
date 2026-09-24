import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HideMessageButton } from "@/components/admin/chat-moderation";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { audit } from "@/lib/data/agencies";
import { getConversationForStaff } from "@/lib/data/conversations";
import { cn } from "@/lib/utils";

/** Read-only transcript for quality review and disputes. Every opening is audited. */
export default async function AdminConversation({ params }: PageProps<"/[locale]/admin/conversations/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff("conversations.view");
  const data = await getConversationForStaff(id);
  if (!data) notFound();
  await audit(staff.id, "conversation.view", "conversation", id);
  const t = await getTranslations("Chat.admin");
  const tc = await getTranslations("Chat");
  const { conversation: c, agency, messages } = data;
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="space-y-4">
      <Link href="/admin/conversations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("back")}
      </Link>
      <div className="grid gap-1 rounded-xl bg-muted p-3 text-sm sm:grid-cols-2">
        <p>
          <span className="font-medium">{t("agency")}:</span> <span dir="auto">{agency?.name}</span> <span dir="ltr">@{agency?.handle}</span>
        </p>
        <p>
          <span className="font-medium">{t("client")}:</span> <span dir="auto">{c.clientName}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {c.requestId ? `${t("request")} ${c.requestId.slice(0, 8)}` : c.inquiryId ? `${t("inquiry")} ${c.inquiryId.slice(0, 8)}` : ""} · {t(`status.${c.status}`)}
        </p>
        <p className="text-xs text-muted-foreground">{t("notice", { version: c.noticeVersion })}</p>
      </div>
      <ol className="space-y-2" data-testid="admin-transcript">
        {messages.map((m) => (
          <li key={m.id} className={cn("rounded-xl border p-3 text-sm", m.side === "agency" && "border-primary/40", m.hiddenAt && "border-dashed bg-muted/50")}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{tc(`sides.${m.side}`)}</span> · <time dateTime={m.createdAt.toISOString()}>{fmt.format(m.createdAt)}</time> · #{m.id}
              </span>
              <HideMessageButton id={m.id} hidden={m.hiddenAt !== null} />
            </div>
            <p className="break-words whitespace-pre-wrap" dir="auto">{m.body}</p>
            {m.hiddenAt && <p className="mt-1 text-xs text-destructive">{t("hiddenAt", { time: fmt.format(m.hiddenAt) })}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
