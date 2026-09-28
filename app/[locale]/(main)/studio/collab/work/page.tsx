import { Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { CollabHeader, CollabTabs, EmptyState } from "@/components/collab/collab-tabs";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { listBuying, listSupplying, openInquiryCount } from "@/lib/data/collab-inquiries";
import { sharesForPartner } from "@/lib/data/milestone-shares";
import { listWorkOrders, pendingOrderCount } from "@/lib/data/work-orders";
import { canUse } from "@/lib/feature-gate";
import { formatDate, formatFils, formatIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ORDER_STYLE, STATUS_STYLE } from "@/components/collab/status";
import { collabPage } from "../gate";


/** Studio → Collaborate → Work: buying (my inquiries), delivering (inquiries to me), disclosed co-delivery (existing shares). */
export default async function CollabWorkPage({ params }: PageProps<"/[locale]/studio/collab/work">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency, soon } = await collabPage();
  if (soon) return <ComingSoon feature="collaboration" />;
  const t = await getTranslations("Collab");
  const [delivery, intel] = await Promise.all([canUse("collaboration_delivery"), canUse("collaboration_intelligence")]);
  const tt = intel ? await getTranslations("Templates") : null;
  const [buying, supplying, shares, inquiries, orders, pending] = await Promise.all([listBuying(agency.id), listSupplying(agency.id), sharesForPartner(agency.id), openInquiryCount(agency.id), delivery ? listWorkOrders(agency.id) : [], delivery ? pendingOrderCount(agency.id) : 0]);
  const badge = inquiries + pending;
  const to = await getTranslations("Orders");
  const ordered = new Set(orders.filter((o) => o.order.inquiryId).map((o) => o.order.inquiryId));
  const pill = (s: string, label: string) => <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[s] ?? "bg-muted")}>{label}</span>;
  return (
    <div className="mx-auto grid max-w-3xl gap-6" data-testid="collab-work">
      <CollabTabs active="work" badges={{ work: badge }} />
      <CollabHeader title={t("work.title")} intro={t("work.intro")} action={<Link href="/studio/collab/work/new" className={buttonVariants({ className: "h-11 gap-1.5" })} data-testid="work-new"><Plus className="size-4" /> {t("inquiry.new")}</Link>} />

      <section className="grid gap-2" data-testid="work-delivering">
        <h2 className="font-semibold">{t("work.delivering")}</h2>
        <p className="text-xs text-muted-foreground">{t("work.deliveringIntro")}</p>
        {supplying.length === 0 ? <EmptyState title={t("work.noneDelivering")} body={t("work.noneDeliveringBody")} action={<Link href="/studio/collab/availability" className={buttonVariants({ variant: "outline", className: "h-11" })}>{t("work.setAvailability")}</Link>} /> : (
          <ul className="grid gap-2">
            {supplying.map(({ inquiry, me, buyer }) => (
              <li key={inquiry.id}>
                <Link href={`/studio/collab/work/${inquiry.id}`} className="flex items-center gap-3 rounded-2xl border p-3 hover:bg-muted/50" data-testid="supplying-row" data-status={me.status}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium" dir="auto">{inquiry.title}</span>
                    <span className="block text-xs text-muted-foreground">{t("work.from", { name: buyer.name })} · {inquiry.sentAt ? formatDate(inquiry.sentAt, locale) : ""}{inquiry.responseBy && ["sent", "viewed"].includes(me.status) ? ` · ${t("work.respondBy", { date: formatDate(inquiry.responseBy, locale) })}` : ""}</span>
                  </span>
                  {pill(me.status, t(`work.recipientStatus.${me.status}`))}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-2" data-testid="work-buying">
        <h2 className="font-semibold">{t("work.buying")}</h2>
        <p className="text-xs text-muted-foreground">{t("work.buyingIntro")}</p>
        {buying.length === 0 ? <EmptyState title={t("work.noneBuying")} body={t("work.noneBuyingBody")} action={<Link href="/studio/collab" className={buttonVariants({ variant: "outline", className: "h-11" })}>{t("work.findSomeone")}</Link>} /> : (
          <ul className="grid gap-2">
            {buying.map((i) => (
              <li key={i.id}>
                <Link href={`/studio/collab/work/${i.id}`} className="flex items-center gap-3 rounded-2xl border p-3 hover:bg-muted/50" data-testid="buying-row" data-status={i.status}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium" dir="auto">{i.title}</span>
                    <span className="block text-xs text-muted-foreground">{t("work.recipients", { count: i.recipients })} · {t("work.quotes", { count: i.quoted })}{i.budgetFils ? ` · ${formatFils(i.budgetFils, locale, i.currency)}` : ""} · {t(`modes.${i.privacyMode}`)}</span>
                  </span>
                  {pill(i.status, t(`work.status.${i.status}`))}
                </Link>
                {delivery && i.status === "converted" && !ordered.has(i.id) && <Link href={`/studio/collab/orders/new?inquiry=${i.id}`} className="mt-1 inline-block text-xs font-medium text-brand" data-testid="order-start">{to("list.start")}</Link>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {delivery && (
        <section className="grid gap-2" data-testid="work-orders">
          <h2 className="font-semibold">{to("list.title")}</h2>
          <p className="text-xs text-muted-foreground">{to("list.intro")}</p>
          {orders.length === 0 ? <EmptyState title={to("list.none")} body={to("list.noneBody")} /> : (
            <ul className="grid gap-2">
              {orders.map(({ order, role, other, version }) => (
                <li key={order.id}>
                  <Link href={`/studio/collab/orders/${order.id}`} className="flex items-center gap-3 rounded-2xl border p-3 hover:bg-muted/50" data-testid="order-row" data-status={order.status} data-role={role}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium" dir="auto">{order.title}</span>
                      <span className="block text-xs text-muted-foreground"><bdi>{to(`list.${role === "buyer" ? "buying" : "delivering"}`, { name: other.name })}</bdi>{version?.dueOn ? <> · <bdi dir="ltr">{formatIsoDate(version.dueOn, locale)}</bdi></> : null} · {to(`mode.${order.mode}`)}</span>
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", ORDER_STYLE[order.status] ?? "bg-muted")}>{to(`status.${order.status}`)}</span>
                  </Link>
                  {intel && role === "buyer" && ["approved", "closed"].includes(order.status) && <Link href={`/studio/collab/work/new?rehire=${order.id}`} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2 h-11 sm:h-9" })} data-testid="order-rehire">{to("list.rehire")}</Link>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {intel && tt && (
        <section className="grid gap-2 rounded-2xl border p-4 text-sm" data-testid="work-templates">
          <h2 className="font-semibold">{tt("title")}</h2>
          <p className="text-muted-foreground">{tt("intro")}</p>
          <div className="flex flex-wrap gap-1.5">
            {(["shoot", "reels", "arabic_copy", "ad_creative", "monthly_calendar"] as const).map((k) => <Link key={k} href={`/studio/collab/work/new?template=${k}`} className={buttonVariants({ variant: "outline", size: "sm", className: "h-11 sm:h-9" })} data-testid={`template-${k}`}>{tt(`${k}.name`)}</Link>)}
          </div>
          <Link href="/studio/collab/worksheet" className="inline-flex min-h-11 items-center font-medium text-brand" data-testid="work-worksheet">{tt("worksheet")}</Link>
        </section>
      )}

      <section className="grid gap-2 rounded-2xl border p-4 text-sm" data-testid="work-disclosed">
        <h2 className="font-semibold">{t("work.disclosed")}</h2>
        <p className="text-muted-foreground">{t("work.disclosedIntro")}</p>
        <Link href="/studio/contracts#partner-work" className="font-medium text-brand">{t("work.disclosedLink", { count: shares.length })}</Link>
      </section>
    </div>
  );
}
