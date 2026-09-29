import { AlertTriangle, CheckCircle2, Circle, FileImage, Lock, ShieldCheck, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { CollabTabs } from "@/components/collab/collab-tabs";
import { collabOptions } from "@/components/collab/options";
import { AmendmentForm, CommentForm, DecisionForm, LinkContractForm, MessageComposer, SubmitWorkForm, TransitionButton, UploadForm, VersionAnswer } from "@/components/collab/order-widgets";
import { ORDER_STYLE } from "@/components/collab/status";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { OPEN_STATUSES, TERMINAL_STATUSES, type PaymentStage } from "@/lib/collab/work-orders";
import { workBadgeCount, workspaceFor, type Workspace } from "@/lib/data/work-orders";
import { feedbackForOrder } from "@/lib/data/collab-feedback";
import { canUse } from "@/lib/feature-gate";
import { lineLabel } from "@/lib/deliverables";
import { DisputeForm, FeedbackForm } from "@/components/collab/intel-widgets";
import { formatDate, formatFils, formatIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deliveryPage } from "../../gate";

const STAGES: PaymentStage[] = ["agreement", "funding", "delivery", "approval", "payout", "receipt"];

/**
 * One work order (docs/49 §3): the agreed version, the amendments, the
 * scoped threads, the files with pinned comments, the review rounds and an
 * honest projection of the linked contract's money. The supplier's view
 * never contains the buyer's private notes or its client contract.
 */
export default async function OrderPage({ params, searchParams }: PageProps<"/[locale]/studio/collab/orders/[id]">) {
  const { locale, id } = await params;
  const offerError = (await searchParams).offer;
  setRequestLocale(locale);
  const { agency, soonFeature } = await deliveryPage(true);
  if (soonFeature) return <ComingSoon feature={soonFeature} />;
  const w = await workspaceFor(agency.id, id);
  if (!w) notFound();
  const [t, tDel, tPlat, tCollab, opts, badge] = await Promise.all([getTranslations("Orders"), getTranslations("Deliverables"), getTranslations("Platforms"), getTranslations("Collab"), collabOptions(locale, agency.country), workBadgeCount(agency.id)]);
  const { order: o, role, current } = w;
  const intel = await canUse("collaboration_intelligence");
  const feedback = intel && ["approved", "closed"].includes(o.status) ? await feedbackForOrder(o.id) : [];
  const tf = await getTranslations("CollabFeedback");
  const other = role === "buyer" ? w.supplier : w.buyer;
  const terminal = TERMINAL_STATUSES.includes(o.status as never);
  const open = OPEN_STATUSES.includes(o.status as never);
  const proposedToMe = w.versions.find((v) => v.status === "proposed" && v.proposedBy !== role && o.status !== "draft" && (o.status !== "offered" || role === "supplier"));
  const accepted = w.versions.filter((v) => v.status === "accepted" || v.status === "superseded").at(-1) ?? null;
  const shown = current ?? accepted;
  const groups = Object.values(w.assets.reduce<Record<string, { id: string; name: string; version: number }>>((acc, a) => { const g = a.groupId ?? a.id; if (!acc[g] || acc[g].version < a.version) acc[g] = { id: g, name: a.name, version: a.version }; return acc; }, {}));
  const lastRound = w.submissions.at(-1);
  const contractHref = w.contract ? `/studio/contracts/${w.contract.id}` : null;
  const pill = (s: string) => <span className={cn("rounded-full px-2 py-0.5 font-medium", ORDER_STYLE[s] ?? "bg-muted")} data-testid="order-status" data-status={s}>{t(`status.${s}`)}</span>;

  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="order-page" data-role={role} data-status={o.status}>
      <CollabTabs active="work" badges={{ work: badge }} />
      <header className="grid gap-2">
        <p className="text-sm text-muted-foreground">{role === "buyer" ? t("header.youBuy", { name: other.name }) : t("header.youDeliver", { name: other.name })} · {tCollab(`kinds.${other.kind}`)}</p>
        <h1 className="text-lg font-bold break-words"><bdi>{o.title}</bdi></h1>
        <p className="flex flex-wrap items-center gap-1.5 text-xs">
          {pill(o.status)}
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5" data-testid="order-mode">{o.mode === "private" ? <Lock className="size-3" aria-hidden /> : <Users className="size-3" aria-hidden />} {t(`mode.${o.mode}`)}</span>
          {shown && <span className="rounded-full bg-muted px-2 py-0.5">{t("versions.current", { n: shown.version })}</span>}
          {w.hold && shown?.dueOn && <span className="rounded-full bg-muted px-2 py-0.5" data-testid="order-hold" data-hold={w.hold.status}>{t(`hold.${w.hold.status}`)} · <bdi dir="ltr">{formatIsoDate(shown.dueOn, locale)}</bdi></span>}
        </p>
        {typeof offerError === "string" && <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive" role="alert" data-testid="offer-error">{t(`errors.${["capacity", "locked", "notFound"].includes(offerError) ? offerError : "invalid"}`)}</p>}
        <Actions w={w} />
      </header>

      {proposedToMe && (
        <section className="grid gap-2 rounded-2xl border-2 border-brand/40 bg-brand/5 p-4 text-sm" data-testid="version-answer">
          <h2 className="font-semibold">{o.status === "offered" ? t("versions.offerTitle", { name: other.name }) : t("versions.amendmentTitle", { name: other.name, n: proposedToMe.version })}</h2>
          <p className="text-xs text-muted-foreground">{o.status === "offered" ? t("versions.offerHint") : t("versions.amendmentHint")}</p>
          <Terms v={proposedToMe} locale={locale} tDel={tDel} tPlat={tPlat} />
          <div className="flex flex-wrap gap-2">
            {o.status === "offered" ? (
              <>
                <TransitionButton id={o.id} action="accept" label={t("actions.accept")} testId="order-accept" />
                <TransitionButton id={o.id} action="decline" label={t("actions.decline")} variant="outline" testId="order-decline" />
              </>
            ) : (
              <VersionAnswer id={o.id} version={proposedToMe.version} acceptLabel={t("versions.accept", { n: proposedToMe.version })} declineLabel={t("versions.decline")} />
            )}
          </div>
        </section>
      )}

      {shown && !(proposedToMe && proposedToMe.id === shown.id) && (
        <section className="grid gap-2 rounded-2xl border p-4" data-testid="order-terms" data-version={shown.version} data-intact={String(w.versions.find((v) => v.id === shown.id)?.intact ?? true)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{t(shown.status === "proposed" ? "terms.offeredTitle" : "terms.title", { n: shown.version })}</h2>
            <span className="text-xs text-muted-foreground">{t(`versions.status.${shown.status}`)}{shown.acceptedAt ? ` · ${formatDate(shown.acceptedAt, locale)}` : ""}</span>
          </div>
          {w.versions.find((v) => v.id === shown.id)?.intact === false && <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive"><AlertTriangle className="size-4" aria-hidden /> {t("terms.tampered")}</p>}
          <Terms v={shown} locale={locale} tDel={tDel} tPlat={tPlat} />
          {w.versions.length > 1 && (
            <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">{t("versions.history", { count: w.versions.length })}</summary>
              <ul className="mt-1 grid gap-0.5">{w.versions.map((v) => <li key={v.id} data-testid="version-row" data-status={v.status}>{t("versions.current", { n: v.version })} · {t(`versions.status.${v.status}`)} · {formatDate(v.createdAt, locale)}</li>)}</ul>
            </details>
          )}
          {open && !w.versions.some((v) => v.status === "proposed") && <AmendmentForm id={o.id} platforms={opts.platforms} initial={{ deliverables: shown.deliverables, scope: shown.scope, revisionAllowance: shown.revisionAllowance, dueOn: shown.dueOn, reviewDays: shown.reviewDays, compensationNote: shown.compensationNote, permissionScope: shown.permissionScope }} />}
          {role === "buyer" && ["draft", "offered"].includes(o.status) && <AmendmentForm id={o.id} platforms={opts.platforms} editing initial={{ deliverables: shown.deliverables, scope: shown.scope, revisionAllowance: shown.revisionAllowance, dueOn: shown.dueOn, reviewDays: shown.reviewDays, compensationNote: shown.compensationNote, permissionScope: shown.permissionScope }} />}
          {w.versions.some((v) => v.status === "proposed" && v.proposedBy === role) && o.status !== "draft" && o.status !== "offered" && <p className="text-xs text-brand" data-testid="amendment-pending">{t("versions.waiting", { name: other.name })}</p>}
        </section>
      )}

      <Money w={w} locale={locale} contractHref={contractHref} />

      <section className="grid gap-3" data-testid="order-files">
        <h2 className="flex items-center gap-2 font-semibold"><FileImage className="size-4 text-brand" aria-hidden /> {t("files.title", { count: w.assets.filter((a) => a.status === "current").length })}</h2>
        {w.assets.length === 0 && <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">{t("files.none")}</p>}
        <ul className="grid gap-3">
          {w.assets.filter((a) => a.status === "current").map((a) => {
            const older = w.assets.filter((b) => b.groupId && b.groupId === a.groupId && b.id !== a.id);
            return (
              <li key={a.id} className="grid gap-2 rounded-2xl border p-3" data-testid="asset" data-version={a.version}>
                <p className="flex flex-wrap items-center justify-between gap-2 text-sm"><b className="break-all" dir="auto">{a.name}</b><span className="text-xs text-muted-foreground">{t("versions.current", { n: a.version })} · <bdi dir="ltr">{a.width}×{a.height}</bdi> · {formatDate(a.createdAt, locale)}</span></p>
                {!terminal ? <CommentForm assetId={a.id} src={`/api/collab/assets/${a.id}`} alt={a.name} /> : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={`/api/collab/assets/${a.id}`} alt={a.name} className="w-full rounded-lg border" data-testid="asset-image" />
                )}
                {a.comments.length > 0 && (
                  <ol className="grid gap-1 text-sm" data-testid="asset-comments">
                    {a.comments.map((c, i) => (
                      <li key={c.id} className="flex gap-2 rounded-lg bg-muted/60 p-2" data-testid="asset-comment">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">{i + 1}</span>
                        <span className="min-w-0"><b>{c.authorName}</b>{c.x !== null && c.y !== null ? <span className="text-xs text-muted-foreground"> · {t("files.pinAt", { x: Math.round(c.x), y: Math.round(c.y) })}</span> : null}<br /><span className="whitespace-pre-line break-words" dir="auto">{c.body}</span></span>
                      </li>
                    ))}
                  </ol>
                )}
                {older.length > 0 && (
                  <details className="text-xs text-muted-foreground" data-testid="asset-older">
                    <summary className="cursor-pointer">{t("files.older", { count: older.length })}</summary>
                    <ul className="mt-2 grid gap-2">
                      {older.map((b) => (
                        <li key={b.id} className="grid gap-1 rounded-lg border border-dashed p-2" data-testid="asset-old" data-version={b.version}>
                          <p className="flex flex-wrap items-center justify-between gap-2"><span>{t("versions.current", { n: b.version })} · {formatDate(b.createdAt, locale)}</span><Link href={`/api/collab/assets/${b.id}`} className="font-medium text-brand" target="_blank" rel="noreferrer">{t("files.open")}</Link></p>
                          {b.comments.map((c, i) => (
                            <p key={c.id} className="text-foreground"><span className="me-1 inline-grid size-4 place-items-center rounded-full bg-muted text-[10px] font-bold">{i + 1}</span><b>{c.authorName}</b>: <bdi>{c.body}</bdi></p>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
        {!terminal && o.status !== "draft" && o.status !== "offered" && <UploadForm id={o.id} groups={groups} />}
      </section>

      {lastRound && (
        <section className="grid gap-2" data-testid="order-rounds">
          <h2 className="font-semibold">{t("review.roundsTitle")}</h2>
          <ul className="grid gap-2">
            {w.submissions.map((s) => (
              <li key={s.id} className="grid gap-1 rounded-2xl border p-3 text-sm" data-testid="round" data-round={s.round} data-decision={s.decision ?? "pending"}>
                <p className="flex flex-wrap items-center justify-between gap-2"><b>{t("review.round", { n: s.round })}</b><span className="text-xs text-muted-foreground">{formatDate(s.submittedAt, locale)} · {t(`review.decision.${s.decision ?? "pending"}`)}</span></p>
                {s.note && <p className="whitespace-pre-line"><bdi>{s.note}</bdi></p>}
                {s.decisionNote && <p className="whitespace-pre-line rounded-lg bg-muted p-2 text-xs"><bdi>{s.decisionNote}</bdi></p>}
                {s.contractEffect && s.contractEffect !== "no_milestone" && <p className="text-xs text-muted-foreground" data-testid="round-effect" data-effect={s.contractEffect}>{t(`review.effects.${s.contractEffect}`)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {role === "supplier" && open && o.status !== "submitted" && shown && <SubmitWorkForm id={o.id} round={(lastRound?.round ?? 0) + 1} allowance={shown.revisionAllowance} />}
      {role === "buyer" && o.status === "submitted" && <DecisionForm id={o.id} effectHint={o.mode === "disclosed" ? t("review.hintDisclosed") : w.contract?.milestone ? t("review.hintMilestone", { title: w.contract.milestone.title }) : t("review.hintNoMilestone")} />}
      {role === "supplier" && o.mode === "disclosed" && w.share && <Link href={`/studio/partner-work/${w.share.id}`} className={buttonVariants({ variant: "outline", className: "h-11 justify-self-start" })} data-testid="order-share-link">{t("review.openShare")}</Link>}


      <section className="grid gap-3" data-testid="order-thread">
        <h2 className="flex items-center gap-2 font-semibold"><Users className="size-4 text-brand" aria-hidden /> {t("thread.sharedTitle")}</h2>
        <Thread messages={w.messages.filter((m) => m.scope === "shared")} me={agency.id} locale={locale} empty={t("thread.sharedEmpty")} />
        {!terminal && <MessageComposer id={o.id} scope="shared" counterpart={other.name} />}
      </section>

      {role === "buyer" && (
        <section className="grid gap-3" data-testid="order-private">
          <h2 className="flex items-center gap-2 font-semibold"><Lock className="size-4 text-muted-foreground" aria-hidden /> {t("thread.privateTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("thread.privateIntro", { name: other.name })}</p>
          <Thread messages={w.messages.filter((m) => m.scope === "private")} me={agency.id} locale={locale} empty={t("thread.privateEmpty")} />
          {!terminal && <MessageComposer id={o.id} scope="private" counterpart={other.name} />}
        </section>
      )}

      {intel && ["approved", "closed"].includes(o.status) && (
        <section id="feedback" className="grid gap-3" data-testid="order-feedback">
          <h2 className="font-semibold">{tf("sectionTitle")}</h2>
          <p className="text-xs text-muted-foreground">{tf("sectionIntro")}</p>
          {feedback.map((f) => (
            <article key={f.id} className="grid gap-1 rounded-2xl border p-3 text-sm" data-testid="feedback-record" data-author={f.authorAgencyId === agency.id ? "me" : "other"} data-status={f.status}>
              <p className="flex flex-wrap items-center justify-between gap-2"><b>{f.authorAgencyId === agency.id ? tf("yours") : tf("theirs", { name: other.name })}</b><span className="text-xs text-muted-foreground">{tf(`visibility.${f.visibility}`)} · {formatDate(f.createdAt, locale)}{f.status !== "published" ? ` · ${tf(`status.${f.status}`)}` : ""}</span></p>
              <p className="text-xs text-muted-foreground">{tf("communication")} {f.communication}/5 · {tf("reliability")} {f.reliability}/5 · {tf("quality")} {f.quality}/5</p>
              {f.body && <p className="whitespace-pre-line"><bdi>{f.body}</bdi></p>}
              {f.aboutAgencyId === agency.id && f.status === "published" && <DisputeForm id={f.id} />}
            </article>
          ))}
          {!feedback.some((f) => f.authorAgencyId === agency.id) && <FeedbackForm workOrderId={o.id} aboutName={other.name} />}
        </section>
      )}
      {role === "supplier" && <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground" data-testid="supplier-order-note">{t("supplierSees")}</p>}
    </div>
  );
}

async function Actions({ w }: { w: Workspace }) {
  const t = await getTranslations("Orders.actions");
  const { order: o, role } = w;
  const items: React.ReactNode[] = [];
  if (role === "buyer") {
    if (o.status === "draft") items.push(<TransitionButton key="offer" id={o.id} action="offer" label={t("offer")} testId="order-offer" />);
    if (["draft", "offered"].includes(o.status)) items.push(<TransitionButton key="withdraw" id={o.id} action="withdraw" label={t("withdraw")} variant="outline" testId="order-withdraw" />);
    if (o.status === "approved") items.push(<TransitionButton key="close" id={o.id} action="close" label={t("close")} variant="outline" testId="order-close" />);
  }
  if (OPEN_STATUSES.includes(o.status as never) && o.status !== "submitted") items.push(<TransitionButton key="cancel" id={o.id} action="cancel" label={t("cancel")} variant="outline" testId="order-cancel" />);
  if (!items.length) return null;
  return <div className="mt-1 flex flex-wrap gap-2" data-testid="order-actions">{items}</div>;
}

type T = (key: string, values?: Record<string, string | number>) => string;
async function Terms({ v, locale, tDel, tPlat }: { v: Workspace["versions"][number] | NonNullable<Workspace["current"]>; locale: string; tDel: T; tPlat: (k: string) => string }) {
  const t = await getTranslations("Orders.terms");
  const row = (label: string, body: React.ReactNode, wide = false) => (
    <div className={cn("grid content-start gap-0.5", wide && "sm:col-span-2")}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words">{body}</dd></div>
  );
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2" data-testid="terms">
      {v.deliverables.length > 0 && row(t("deliverables"), v.deliverables.map((d) => lineLabel(d, tDel, tPlat)).join(locale === "ar" ? "، " : ", "), true)}
      {v.scope && row(t("scope"), <span className="whitespace-pre-line" dir="auto">{v.scope}</span>, true)}
      {row(t("revisions"), String(v.revisionAllowance))}
      {row(t("dueOn"), v.dueOn ? <bdi dir="ltr">{formatIsoDate(v.dueOn, locale)}</bdi> : "—")}
      {row(t("reviewDays"), t("days", { count: v.reviewDays }))}
      {v.compensationNote && row(t("compensation"), <span dir="auto">{v.compensationNote}</span>)}
      {v.permissionScope && row(t("permission"), <span className="whitespace-pre-line" dir="auto">{v.permissionScope}</span>, true)}
    </dl>
  );
}

/** The money panel: read from the contract, stage by stage, never inferred. */
async function Money({ w, locale, contractHref }: { w: Workspace; locale: string; contractHref: string | null }) {
  const t = await getTranslations("Orders.money");
  const { order: o, role, payment: p, contract: c } = w;
  return (
    <section className="grid gap-2 rounded-2xl border p-4 text-sm" data-testid="order-money" data-headline={p.headline} data-mode={p.mode}>
      <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-brand" aria-hidden /> {t("title")}</h2>
      {c ? (
        <>
          <p className="text-xs text-muted-foreground">
            {contractHref ? <Link href={contractHref} className="font-medium text-brand" data-testid="order-contract-link"><bdi>{c.number} · {c.title}</bdi></Link> : <bdi>{c.number} · {c.title}</bdi>}
            {c.milestone ? <> · <bdi>{t("milestone", { title: c.milestone.title })}</bdi> · <bdi>{formatFils(c.milestone.amountFils, locale, c.currency)}</bdi></> : <> · {t("noMilestone")}</>}
          </p>
          <ol className="flex flex-wrap gap-x-3 gap-y-1 text-xs" data-testid="money-stages">
            {STAGES.filter((s) => p.stages[s] !== "n/a").map((s) => (
              <li key={s} className={cn("inline-flex items-center gap-1", p.stages[s] === "done" ? "text-foreground" : "text-muted-foreground")} data-stage={s} data-state={p.stages[s]}>
                {p.stages[s] === "done" ? <CheckCircle2 className="size-3.5 text-brand" aria-hidden /> : <Circle className="size-3.5" aria-hidden />} {t(`stages.${s}`)}
              </li>
            ))}
          </ol>
          <p className="font-medium" data-testid="money-headline">{t(`headline.${p.headline}`)}</p>
          {o.status === "submitted" && c.milestone && p.stages.delivery !== "done" && <p className="text-xs text-muted-foreground" data-testid="money-not-on-contract">{t("submittedNotOnContract")}</p>}
          <p className="text-xs text-muted-foreground">{p.mode === "protected" ? (p.live ? t("protectedLive") : t("protectedTest")) : t("direct")}</p>
        </>
      ) : (
        <>
          <p className="font-medium" data-testid="money-headline">{t("headline.no_contract")}</p>
          <p className="text-xs text-muted-foreground">{t("noContractHint")}</p>
          {role === "buyer" && !TERMINAL_STATUSES.includes(o.status as never) && (w.linkable.length > 0 ? <LinkContractForm id={o.id} contracts={w.linkable.map((l) => ({ key: l.id, label: `${l.number} · ${l.title}`, milestones: l.milestones.map((m) => ({ key: m.id, label: m.title })) }))} /> : <Link href="/studio/contracts" className="text-xs font-medium text-brand" data-testid="order-no-linkable">{t("askContract")}</Link>)}
        </>
      )}
      {role === "buyer" && o.parentContractId && <p className="text-xs text-muted-foreground" data-testid="order-parent">{t("parentPrivate")}</p>}
    </section>
  );
}

function Thread({ messages, me, locale, empty }: { messages: Workspace["messages"]; me: string; locale: string; empty: string }) {
  if (!messages.length) return <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className="grid gap-2">
      {messages.map((m) => (
        <li key={m.id} className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.authorAgencyId === me ? "justify-self-end border border-brand-line bg-brand-soft" : "bg-muted")} data-testid={`message-${m.scope}`}>
          <p className="text-[11px] text-muted-foreground">{m.authorName} · {formatDate(m.createdAt, locale)}</p>
          <p className="whitespace-pre-line break-words" dir="auto">{m.body}</p>
        </li>
      ))}
    </ol>
  );
}
