import { MessageCircle, MessagesSquare } from "lucide-react";
import { currencyOf } from "@/lib/countries";
import { getLocale, getTranslations } from "next-intl/server";
import { AgencyAvatar } from "@/components/agency-avatar";
import { RatingBadge } from "@/components/reviews/stars";
import { buttonVariants } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import type { ProjectRequest } from "@/lib/db/schema";
import { unreadByAgencyForRequest } from "@/lib/data/conversations";
import type { ProposalView } from "@/lib/data/requests";
import { formatJod, timeAgo } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { whatsappLink } from "@/lib/text";
import { cn } from "@/lib/utils";
import { CloseRequestButton, ProposalActions } from "./proposal-actions";

export async function RequestView({ request, proposals, invitedCount, access }: { request: ProjectRequest; proposals: ProposalView[]; invitedCount: number; access: { token?: string; requestId?: string } }) {
  const t = await getTranslations("Requests");
  const tc = await getTranslations("Common");
  const tCity = await getTranslations("Cities");
  const tp = await getTranslations("Post");
  const tpk = await getTranslations("Packages");
  const tchat = await getTranslations("Chat");
  const locale = await getLocale();
  const unreadFrom = await unreadByAgencyForRequest(request.id);
  const chatHref = (handle: string) => (access.token ? `/r/${access.token}/chat/${handle}` : `/requests/${request.id}/chat/${handle}`);
  const open = request.status === "open" && request.expiresAt > new Date();
  const fmtDate = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en", { day: "numeric", month: "long" });
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <header className="space-y-2">
        <h1 className="text-xl font-bold">{t("pageTitle")}</h1>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className={cn("rounded-full px-2 py-0.5 text-xs", open ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>{open ? t("status.open") : t("status.closed")}</span>
          {open && <span className="text-muted-foreground">{t("expires", { date: fmtDate.format(request.expiresAt) })}</span>}
          <span className="text-muted-foreground">· {t("invited", { count: invitedCount })}</span>
        </p>
        <div className="rounded-xl bg-muted p-3 text-sm">
          <p className="mb-1 font-medium">{request.services.map((s) => serviceLabel(s, locale)).join(" · ")}</p>
          <p className="text-xs text-muted-foreground">
            {request.city ? tCity(request.city) : t("anyCity")}
            {request.budgetMaxJod ? ` · ${request.budgetMinJod ?? 0}–${request.budgetMaxJod} JOD` : ""}
          </p>
          {(request.fullService || request.brands) && (
            <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {request.fullService && <span className="rounded-full bg-brand/10 px-2 py-0.5 font-medium text-brand">{t("fullService")}</span>}
              {request.brands && <span className="rounded-full bg-background px-2 py-0.5" dir="auto">{t("brands")}: {request.brands}</span>}
            </p>
          )}
          <p className="mt-2 whitespace-pre-line" dir="auto">{request.description}</p>
        </div>
        {open && <CloseRequestButton access={access} />}
      </header>

      <section>
        <h2 className="mb-2 font-semibold">{t("proposals", { count: proposals.length })}</h2>
        {!proposals.length && <p className="rounded-xl border p-4 text-sm text-muted-foreground">{t("noProposals")}</p>}
        <ul className="space-y-3" data-testid="proposals">
          {proposals.map((p) => (
            <li key={p.id} className={cn("space-y-3 rounded-xl border p-4", p.status === "accepted" && "border-primary", p.status === "declined" && "opacity-60")}>
              <div className="flex items-start gap-3">
                <AgencyAvatar name={p.agency.name} src={p.agency.avatarUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <Link href={`/a/${p.agency.handle}`} className="flex items-center gap-1 font-semibold">
                    {p.agency.name}
                    {p.agency.isVerified && <VerifiedBadge label={tc("verified")} />}
                  </Link>
                  {p.agency.ratingAverage !== null && <RatingBadge average={p.agency.ratingAverage} count={p.agency.ratingCount} />}
                  <p suppressHydrationWarning className="text-xs text-muted-foreground">{timeAgo(p.createdAt.toISOString(), locale)} · {t(`proposalStatus.${p.status}`)}</p>
                </div>
                <div className="text-end">
                  <p className="text-lg font-bold">{formatJod(p.priceJod, locale, currencyOf(p.agency.country))}</p>
                  <p className="text-xs text-muted-foreground">{p.billing === "monthly" ? tpk("perMonth") : tpk("oneOff")}</p>
                </div>
              </div>
              <p className="text-sm"><span className="font-medium">{t("timelineLabel")}:</span> <span dir="auto">{p.timeline}</span></p>
              <p className="whitespace-pre-line text-sm" dir="auto">{p.message}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ProposalActions access={access} proposalId={p.id} status={p.status} />
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={chatHref(p.agency.handle)} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "relative gap-1.5")} data-testid="proposal-chat">
                    <MessagesSquare className="size-3.5" />
                    {tchat("openChat")}
                    {unreadFrom.has(p.agency.id) && <span className="absolute -end-1 -top-1 size-2.5 rounded-full bg-destructive ring-2 ring-background" aria-label={tchat("unread")} data-testid="proposal-chat-unread" />}
                  </Link>
                  {p.agency.whatsapp && (
                    <a
                      href={whatsappLink(p.agency.whatsapp, t("whatsappMessage"))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ size: "sm" }), "gap-1.5 bg-[#25D366] text-white hover:bg-[#1ebe5b]")}
                    >
                      <MessageCircle className="size-3.5" />
                      {tp("whatsapp")}
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
