import { getTranslations } from "next-intl/server";
import type { ContractView } from "@/lib/data/contracts";
import { lineLabel } from "@/lib/deliverables";
import { formatDate } from "@/lib/format";
import { formatFils } from "@/lib/payments/provider";

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 mb-1.5 font-semibold">{children}</h3>;
}

const day = (d: string, locale: string) => formatDate(new Date(`${d}T12:00:00Z`), locale);

/** The full agreement as both parties read it (and print it). */
export async function ContractDocument({ v, locale }: { v: ContractView; locale: string }) {
  const t = await getTranslations("Contracts.doc");
  const td = await getTranslations("Deliverables");
  const tp = await getTranslations("Platforms");
  const c = v.contract;
  const money = (f: number) => formatFils(f, locale);
  const specials = v.milestones.flatMap((m) => m.checks.filter((k) => k.source === "special_request").map((k) => ({ text: k.text, milestone: m.title })));

  return (
    <article className="contract-doc space-y-1 text-sm leading-relaxed" data-testid="contract-document">
      <header className="mb-4 border-b pb-3">
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground" dir="ltr">{c.number}</p>
        <p className="mt-1 font-medium" dir="auto">{c.title}</p>
        {c.summary && <p className="text-muted-foreground" dir="auto">{c.summary}</p>}
      </header>

      <H>{t("parties")}</H>
      <p>{t("partiesBody", { agency: v.agency.name, handle: v.agency.handle, client: c.clientName, phone: c.clientPhone })}</p>

      <H>{t("scope")}</H>
      {c.items.length ? (
        <ul className="list-disc ps-5">
          {c.items.map((line, i) => (
            <li key={i}>{lineLabel(line, (k, vals) => td(k as "add", vals as never), (p) => tp(p as "instagram"))}</li>
          ))}
        </ul>
      ) : (
        <p>{t("noItems")}</p>
      )}

      <H>{t("period")}</H>
      <p>{t("periodBody", { start: day(c.startDate, locale), end: day(c.endDate, locale) })}</p>

      <H>{t("milestones")}</H>
      <ol className="space-y-2">
        {v.milestones.map((m, i) => (
          <li key={m.id} className="rounded-lg border p-2.5">
            <p className="flex flex-wrap justify-between gap-2 font-medium">
              <span dir="auto">
                {i + 1}. {m.title}
              </span>
              <span className="tabular-nums">
                {money(m.amountFils)} · {day(m.dueDate, locale)}
              </span>
            </p>
            <ul className="mt-1 list-disc ps-5 text-muted-foreground">
              {m.checks.map((k) => (
                <li key={k.id} dir="auto">
                  {k.source === "special_request" ? "★ " : ""}
                  {k.text}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="font-semibold tabular-nums">{money(c.totalFils)}</p>

      {specials.length > 0 && (
        <>
          <H>{t("specials")}</H>
          <p>{t("specialsBody")}</p>
          <ul className="list-disc ps-5">
            {specials.map((s, i) => (
              <li key={i} dir="auto">
                ★ {s.text} <span className="text-muted-foreground">({s.milestone})</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <H>{t("payment")}</H>
      <p>{c.paymentMode === "protected" ? t("paymentProtected", { fee: c.feePercent }) : t("paymentDirect")}</p>

      <H>{t("changes")}</H>
      <p>{t("changesBody")}</p>

      {c.nda && (
        <>
          <H>{t("nda")}</H>
          <p>{t("ndaBody")}</p>
          {c.ndaExtra && <p dir="auto">{t("ndaExtra", { text: c.ndaExtra })}</p>}
        </>
      )}

      <H>{t("general")}</H>
      <p>{t("generalBody")}</p>

      <H>{t("signatures")}</H>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{v.agency.name}</p>
          <p className="font-serif text-lg italic" dir="auto">{c.agencySignerName}</p>
          <p className="text-xs">{t("signedBy", { name: c.agencySignerName, date: formatDate(c.agencySignedAt, locale) })}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{c.clientName}</p>
          {c.clientSignedAt && c.clientSignerName ? (
            <>
              <p className="font-serif text-lg italic" dir="auto">{c.clientSignerName}</p>
              <p className="text-xs">{t("signedBy", { name: c.clientSignerName, date: formatDate(c.clientSignedAt, locale) })}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t("notSigned")}</p>
          )}
        </div>
      </div>
      <p className="mt-3 break-all text-[11px] text-muted-foreground" dir="ltr">{t("fingerprint", { hash: c.termsHash })}</p>
      <p className="text-[11px] text-muted-foreground">{t("disclaimer")}</p>
    </article>
  );
}
