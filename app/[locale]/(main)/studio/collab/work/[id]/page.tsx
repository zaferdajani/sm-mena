import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { AgencyAvatar } from "@/components/agency-avatar";
import { CollabTabs } from "@/components/collab/collab-tabs";
import { AcceptQuote, QuoteForm } from "@/components/collab/quote-widgets";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { currencyOf } from "@/lib/countries";
import { arePartners } from "@/lib/data/contracts";
import { canUse } from "@/lib/feature-gate";
import { inquiryForBuyer, inquiryForSupplier, type SupplierInquiry } from "@/lib/data/collab-inquiries";
import { formatDate, formatFils } from "@/lib/format";
import { lineLabel } from "@/lib/deliverables";
import { roleLabel } from "@/lib/services/catalog";
import { cn } from "@/lib/utils";
import { declineInquiryAction, retryHandoffAction, withdrawInquiryAction } from "../../actions";
import { collabPage } from "../../gate";
import { STATUS_STYLE } from "@/components/collab/status";

/** One inquiry: the buyer compares quotes; a supplier answers. Anyone else: not found. */
export default async function InquiryPage({ params, searchParams }: PageProps<"/[locale]/studio/collab/work/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { agency, soon } = await collabPage();
  if (soon) return <ComingSoon feature="collaboration" />;
  const sent = (await searchParams).sent === "1";
  const t = await getTranslations("Collab");
  const buyerView = await inquiryForBuyer(agency.id, id);
  if (buyerView) return <BuyerPage v={buyerView} locale={locale} sent={sent} />;
  const supplierView = await inquiryForSupplier(agency.id, id);
  if (!supplierView) notFound();
  const tCity = await getTranslations("Cities");
  const tDel = await getTranslations("Deliverables");
  const tPlat = await getTranslations("Platforms");
  const { inquiry, buyer, me, myQuotes } = supplierView;
  const open = ["sent", "replied"].includes(inquiry.status) && ["sent", "viewed", "quoted"].includes(me.status) && (!inquiry.responseBy || inquiry.responseBy > new Date());
  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="inquiry-supplier">
      <CollabTabs active="work" />
      <header className="grid gap-2">
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><AgencyAvatar name={buyer.name} src={buyer.avatarUrl} size={28} /> {t("work.from", { name: buyer.name })} · {t(`kinds.${buyer.kind}`)} · {tCity(buyer.city)}</p>
        <h1 className="text-lg font-bold break-words" dir="auto">{inquiry.title}</h1>
        <p className="flex flex-wrap gap-1.5 text-xs">
          <span className={cn("rounded-full px-2 py-0.5 font-medium", STATUS_STYLE[me.status])} data-testid="my-status">{t(`work.recipientStatus.${me.status}`)}</span>
          <span className="rounded-full bg-muted px-2 py-0.5">{t(`modes.${inquiry.privacyMode}`)}</span>
          {inquiry.responseBy && <span className="rounded-full bg-muted px-2 py-0.5">{t("work.respondBy", { date: formatDate(inquiry.responseBy, locale) })}</span>}
        </p>
      </header>
      <InquiryDetails i={inquiry} locale={locale} tCity={tCity} tDel={tDel} tPlat={tPlat} />
      <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground" data-testid="supplier-scope-note">{t("inquiry.supplierSees")}</p>
      {myQuotes.length > 0 && (
        <section className="grid gap-2" data-testid="my-quotes">
          <h2 className="font-semibold">{t("quote.mine")}</h2>
          {myQuotes.map((q) => <QuoteCard key={q.id} q={q} locale={locale} />)}
        </section>
      )}
      {open ? (
        <div className="grid gap-3">
          <QuoteForm inquiryId={inquiry.id} currency={currencyOf(agency.country)} hasQuote={myQuotes.some((q) => q.status === "open")} />
          <form action={declineInquiryAction}><input type="hidden" name="inquiryId" value={inquiry.id} /><SubmitButton variant="ghost" className="h-11" testId="inquiry-decline">{t("quote.decline")}</SubmitButton></form>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="inquiry-closed">{me.status === "accepted" ? t("quote.youWon") : t("quote.closed")}</p>
      )}
      {me.status === "accepted" && <Link href="/studio/contracts" className={buttonVariants({ className: "h-11 justify-self-start" })} data-testid="supplier-contract-link">{t("quote.writeContract")}</Link>}
    </div>
  );
}

async function BuyerPage({ v, locale, sent }: { v: NonNullable<Awaited<ReturnType<typeof inquiryForBuyer>>>; locale: string; sent: boolean }) {
  const t = await getTranslations("Collab");
  const tCity = await getTranslations("Cities");
  const tDel = await getTranslations("Deliverables");
  const tPlat = await getTranslations("Platforms");
  const open = ["sent", "replied"].includes(v.status);
  const winner = v.quotes.find((q) => q.status === "accepted");
  const partners = winner ? await arePartners(v.buyerAgencyId, winner.supplierAgencyId) : false;
  const delivery = winner ? await canUse("collaboration_delivery") : false;
  const to = await getTranslations("Orders");
  const openQuotes = v.quotes.filter((q) => q.status === "open");
  const currencies = new Set(openQuotes.map((q) => q.currency));
  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="inquiry-buyer">
      <CollabTabs active="work" />
      {sent && <p role="status" className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="inquiry-sent">✓ {t("inquiry.sentNote", { count: v.recipients.length })}</p>}
      <header className="grid gap-2">
        <h1 className="text-lg font-bold break-words" dir="auto">{v.title}</h1>
        <p className="flex flex-wrap gap-1.5 text-xs">
          <span className={cn("rounded-full px-2 py-0.5 font-medium", STATUS_STYLE[v.status])} data-testid="inquiry-status">{t(`work.status.${v.status}`)}</span>
          <span className="rounded-full bg-muted px-2 py-0.5">{t(`modes.${v.privacyMode}`)}</span>
          {v.responseBy && open && <span className="rounded-full bg-muted px-2 py-0.5">{t("work.respondBy", { date: formatDate(v.responseBy, locale) })}</span>}
          {v.parentContractId && <span className="rounded-full bg-muted px-2 py-0.5" data-testid="parent-private">{t("inquiry.parentPrivate")}</span>}
        </p>
      </header>
      <InquiryDetails i={v} locale={locale} tCity={tCity} tDel={tDel} tPlat={tPlat} />

      <section className="grid gap-2" data-testid="inquiry-recipients-status">
        <h2 className="font-semibold">{t("inquiry.recipientsTitle")}</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {v.recipients.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-full border py-1 pe-3 ps-1" data-testid="recipient-status" data-status={r.status}>
              <AgencyAvatar name={r.supplier.name} src={r.supplier.avatarUrl} size={24} /> {r.supplier.name}
              <span className={cn("rounded-full px-1.5 text-[11px]", STATUS_STYLE[r.status])}>{t(`work.recipientStatus.${r.status}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-2" data-testid="quotes-compare">
        <h2 className="font-semibold">{t("quote.compareTitle")}</h2>
        <p className="text-xs text-muted-foreground">{t("quote.compareIntro")}{currencies.size > 1 ? ` ${t("quote.mixedCurrencies")}` : ""}</p>
        {v.quotes.length === 0 ? (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">{t("quote.none")}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {v.quotes.filter((q) => q.status !== "superseded").map((q) => (
              <QuoteCard key={q.id} q={q} locale={locale} supplier={q.supplier.name}>
                {open && q.status === "open" && <AcceptQuote inquiryId={v.id} quoteId={q.id} />}
              </QuoteCard>
            ))}
          </div>
        )}
      </section>

      {v.status === "converted" && winner && (
        <section className="grid gap-2 rounded-2xl border-2 border-brand/40 bg-brand/5 p-4 text-sm" data-testid="handoff">
          <h2 className="font-semibold">{t("handoff.title", { name: winner.supplier.name })}</h2>
          {v.contractRequestId ? (
            <>
              <p>{t("handoff.contractRequested")}</p>
              <Link href="/studio/contracts" className={buttonVariants({ variant: "outline", className: "h-11 justify-self-start" })} data-testid="handoff-contracts">{t("handoff.openContracts")}</Link>
            </>
          ) : partners ? (
            <form action={retryHandoffAction}><input type="hidden" name="inquiryId" value={v.id} /><p className="mb-2">{t("handoff.partnersNow")}</p><SubmitButton className="h-11" testId="handoff-retry">{t("handoff.requestContract")}</SubmitButton></form>
          ) : (
            <p data-testid="handoff-waiting">{t("handoff.partnerPending")}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("handoff.notSigned")}</p>
          {delivery && <Link href={`/studio/collab/orders/new?inquiry=${v.id}`} className={buttonVariants({ className: "h-11 justify-self-start" })} data-testid="handoff-order">{to("list.start")}</Link>}
        </section>
      )}

      {open && <form action={withdrawInquiryAction}><input type="hidden" name="inquiryId" value={v.id} /><SubmitButton variant="ghost" className="h-11" testId="inquiry-withdraw">{t("inquiry.withdraw")}</SubmitButton></form>}
    </div>
  );
}

type T = (key: string, values?: Record<string, string | number>) => string;
function InquiryDetails({ i, locale, tCity, tDel, tPlat }: { i: SupplierInquiry; locale: string; tCity: (k: string) => string; tDel: T; tPlat: (k: string) => string }) {
  return (
    <dl className="grid gap-2 rounded-2xl border p-4 text-sm sm:grid-cols-2" data-testid="inquiry-details">
      {i.role && <Row label="role" locale={locale}>{roleLabel(i.role, locale)}</Row>}
      {i.deliverables.length > 0 && <Row label="deliverables" locale={locale}>{i.deliverables.map((d) => lineLabel(d, tDel, tPlat)).join(locale === "ar" ? "، " : ", ")}</Row>}
      {i.scope && <Row label="scope" locale={locale} wide><span className="whitespace-pre-line" dir="auto">{i.scope}</span></Row>}
      {i.assetsNote && <Row label="assetsNote" locale={locale}><span dir="auto">{i.assetsNote}</span></Row>}
      {(i.startsOn || i.dueOn) && <Row label="dates" locale={locale}><bdi dir="ltr">{i.startsOn ?? "…"} → {i.dueOn ?? "…"}</bdi> ({i.timezone})</Row>}
      <Row label="workMode" locale={locale}>{i.city ? `${tCity(i.city)} · ` : ""}<WorkModeLabel m={i.workMode} /></Row>
      <Row label="budget" locale={locale}>{i.budgetFils ? formatFils(i.budgetFils, locale, i.currency) : "—"}</Row>
    </dl>
  );
}

async function WorkModeLabel({ m }: { m: string }) {
  const t = await getTranslations("Collab.workMode");
  return <>{t(m as "remote")}</>;
}

async function Row({ label, children, wide }: { label: string; locale: string; children: React.ReactNode; wide?: boolean }) {
  const t = await getTranslations("Collab.inquiry.fields");
  return (
    <div className={cn("grid gap-0.5", wide && "sm:col-span-2")}>
      <dt className="text-xs text-muted-foreground">{t(label)}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

async function QuoteCard({ q, locale, supplier, children }: { q: { id: string; version: number; amountFils: number; currency: string; startsOn: string | null; dueOn: string | null; scopeNote: string; exclusions: string; status: string; createdAt: Date }; locale: string; supplier?: string; children?: React.ReactNode }) {
  const t = await getTranslations("Collab.quote");
  return (
    <article className={cn("grid gap-2 rounded-2xl border p-3 text-sm", q.status === "accepted" && "border-brand bg-brand/5")} data-testid="quote-card" data-status={q.status}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{supplier ?? t("version", { n: q.version })}</span>
        <span className="text-lg font-bold tabular-nums">{formatFils(q.amountFils, locale, q.currency)}</span>
      </div>
      <p className="text-xs text-muted-foreground">{t(`status.${q.status}`)}{supplier ? ` · ${t("version", { n: q.version })}` : ""} · {formatDate(q.createdAt, locale)}{q.startsOn || q.dueOn ? <> · <bdi dir="ltr">{q.startsOn ?? "…"} → {q.dueOn ?? "…"}</bdi></> : ""}</p>
      {q.scopeNote && <p className="whitespace-pre-line" dir="auto">{q.scopeNote}</p>}
      {q.exclusions && <p className="text-xs" dir="auto"><b>{t("exclusions")}:</b> {q.exclusions}</p>}
      {children}
    </article>
  );
}
