"use client";

import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";
import { createContractAction } from "@/app/[locale]/(main)/contract-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DeliverableLine } from "@/lib/db/schema";
import { deliverable } from "@/lib/deliverables";
import { DeliverablesPicker } from "./deliverables-picker";
import { SignaturePad } from "./signature-pad";

type MilestoneDraft = { title: string; dueDate: string; amountJod: string; checks: string };
export type BuilderInitial = {
  client?: { name: string; phone: string; email?: string };
  title?: string;
  summary?: string;
  items?: DeliverableLine[];
  totalJod?: number;
  months?: number;
  requestId?: string;
  proposalId?: string;
  packageId?: string;
  note?: string;
  kpis?: { label: string; target: string }[];
  clientTerms?: string;
  agencyLegalName?: string;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: string, n: number) => iso(new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000));
const daysBetween = (a: string, b: string) => Math.max(0, Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000));

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <span className="grid size-7 place-items-center rounded-full bg-brand text-sm text-white">{n}</span>
        {title}
      </h2>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}

export function ContractBuilder({
  initial,
  agencyName,
  platforms,
  feePercent,
  currency,
  countryName,
}: {
  initial: BuilderInitial;
  agencyName: string;
  platforms: { key: string; label: string }[];
  feePercent: number;
  currency: string;
  countryName: string;
}) {
  const t = useTranslations("Contracts.builder");
  const tl = useTranslations("Agreements");
  const td = useTranslations("Deliverables");
  const [state, action] = useActionState(createContractAction, undefined);
  const today = iso(new Date());
  const months = Math.max(1, initial.months ?? 1);

  const [client, setClient] = useState({ name: initial.client?.name ?? "", phone: initial.client?.phone ?? "", email: initial.client?.email ?? "" });
  const [title, setTitle] = useState(initial.title ?? "");
  const [summary, setSummary] = useState(initial.summary ?? "");
  const [items, setItems] = useState<DeliverableLine[]>(initial.items ?? []);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, months * 30 - 1));
  const [totalJod, setTotalJod] = useState(String(initial.totalJod ?? ""));
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([]);
  const [requests, setRequests] = useState<{ text: string; milestone: number }[]>([]);
  const [kpis, setKpis] = useState<{ label: string; target: string }[]>(initial.kpis ?? []);
  const [cadence, setCadence] = useState<string>("weekly");
  const [mediaBudget, setMediaBudget] = useState("");
  const [nda, setNda] = useState(false);
  const [ndaExtra, setNdaExtra] = useState("");
  const [ndaYears, setNdaYears] = useState(2);
  const [legal, setLegal] = useState({ agencyLegalName: initial.agencyLegalName ?? agencyName, agencyRegNumber: "", clientRegNumber: "" });
  const [agencyTerms, setAgencyTerms] = useState("");
  const [clientTerms, setClientTerms] = useState(initial.clientTerms ?? "");
  const [signer, setSigner] = useState("");
  const [agree, setAgree] = useState(false);

  const platformName = (k?: string | null) => platforms.find((p) => p.key === k)?.label ?? "";
  /** Checklist lines for one of n milestones: monthly things every time, countable things shared out. */
  const checksFor = (index: number, n: number) =>
    items
      .map((line) => {
        const d = deliverable(line.key);
        if (!d) return "";
        const name = `${td(`items.${line.key}`)}${line.platform ? ` (${platformName(line.platform)})` : ""}`;
        if (d.unit === "month") return name;
        const share = Math.floor(line.quantity / n) + (index < line.quantity % n ? 1 : 0);
        return share > 0 ? `${share} × ${name}` : "";
      })
      .filter(Boolean)
      .join("\n");

  const split = (n: number) => {
    const total = Number(totalJod) || 0;
    const span = daysBetween(start, end);
    const each = Math.floor((total / n) * 1000) / 1000;
    setMilestones(
      Array.from({ length: n }, (_, i) => ({
        title: n === 1 ? title || t("milestone", { n: 1 }) : t("milestone", { n: i + 1 }),
        dueDate: i === n - 1 ? end : addDays(start, Math.round(((i + 1) * span) / n)),
        amountJod: String(i === n - 1 ? Math.round((total - each * (n - 1)) * 1000) / 1000 : each),
        checks: checksFor(i, n),
      })),
    );
  };

  const sum = useMemo(() => milestones.reduce((s, m) => s + (Number(m.amountJod) || 0), 0), [milestones]);
  const setM = (i: number, patch: Partial<MilestoneDraft>) => setMilestones(milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const payload = JSON.stringify({
    title,
    summary,
    items,
    specialRequests: requests.filter((r) => r.text.trim()),
    startDate: start,
    endDate: end,
    paymentMode: "protected",
    nda,
    ndaExtra: nda ? ndaExtra : null,
    ndaYears: nda ? ndaYears : null,
    ...legal,
    agencyTerms: agencyTerms || null,
    clientTerms: clientTerms || null,
    client,
    milestones: milestones.map((m) => ({ title: m.title, dueDate: m.dueDate, amountJod: Number(m.amountJod) || 0, checks: m.checks.split("\n").map((c) => c.trim()).filter(Boolean) })),
    kpis: kpis.filter((k) => k.label.trim() || k.target.trim()),
    reportingCadence: cadence || null,
    mediaBudgetJod: Number(mediaBudget) || null,
    signerName: signer,
    agree,
    requestId: initial.requestId ?? null,
    proposalId: initial.proposalId ?? null,
    packageId: initial.packageId ?? null,
  });

  return (
    <form action={action} className="space-y-4" data-testid="contract-builder">
      <input type="hidden" name="payload" value={payload} />
      {initial.note && <p className="rounded-xl bg-brand/10 p-3 text-sm">{initial.note}</p>}

      <Step n={1} title={t("s1")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="c-name">{t("clientName")}</Label>
            <Input id="c-name" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} required dir="auto" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-phone">{t("clientPhone")}</Label>
            <Input id="c-phone" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} required dir="ltr" inputMode="tel" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-email">{t("clientEmail")}</Label>
            <Input id="c-email" type="email" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} dir="ltr" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="c-reg">{tl("clientReg")}</Label>
            <Input id="c-reg" value={legal.clientRegNumber} onChange={(e) => setLegal({ ...legal, clientRegNumber: e.target.value })} maxLength={60} dir="ltr" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-legal">{tl("agencyLegalName")}</Label>
            <Input id="a-legal" value={legal.agencyLegalName} onChange={(e) => setLegal({ ...legal, agencyLegalName: e.target.value })} maxLength={160} dir="auto" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-reg">{tl("agencyReg")}</Label>
            <Input id="a-reg" value={legal.agencyRegNumber} onChange={(e) => setLegal({ ...legal, agencyRegNumber: e.target.value })} maxLength={60} dir="ltr" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{tl("identityHint")}</p>
      </Step>

      <Step n={2} title={t("s2")}>
        <div className="grid gap-1.5">
          <Label htmlFor="c-title">{t("projectTitle")}</Label>
          <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("projectTitlePh")} required maxLength={120} dir="auto" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="c-summary">{t("summary")}</Label>
          <Textarea id="c-summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={t("summaryPh")} rows={2} maxLength={2000} dir="auto" />
        </div>
      </Step>

      <Step n={3} title={t("s3")}>
        <DeliverablesPicker value={items} onChange={setItems} platforms={platforms} />
      </Step>

      <Step n={4} title={t("s4")}>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="c-start">{t("start")}</Label>
            <Input id="c-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} required dir="ltr" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-end">{t("end")}</Label>
            <Input id="c-end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} required dir="ltr" />
          </div>
        </div>
      </Step>

      <Step n={5} title={t("s5")} hint={t("s5hint")}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="c-total">{tl("totalPrice", { currency })}</Label>
            <Input id="c-total" type="number" min={0} step="0.001" value={totalJod} onChange={(e) => setTotalJod(e.target.value)} className="w-36" dir="ltr" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">{t("split")}</span>
            {[
              [1, "splitOne"],
              [2, "splitTwo"],
              [3, "splitThree"],
            ].map(([n, k]) => (
              <button key={k} type="button" onClick={() => split(n as number)} className="rounded-full border px-3 py-1 hover:bg-muted" data-testid={`split-${n}`}>
                {t(k as "splitOne")}
              </button>
            ))}
            <button type="button" onClick={() => split(Math.max(1, Math.round(daysBetween(start, end) / 30)))} className="rounded-full border px-3 py-1 hover:bg-muted">
              {t("splitMonthly")}
            </button>
          </div>
        </div>
        <ol className="space-y-3">
          {milestones.map((m, i) => (
            <li key={i} className="space-y-2 rounded-xl bg-muted/40 p-3" data-testid="milestone-row">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{t("milestone", { n: i + 1 })}</span>
                <button type="button" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" /> {t("removeMilestone")}
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_10rem_8rem]">
                <Input aria-label={t("mTitle")} value={m.title} onChange={(e) => setM(i, { title: e.target.value })} dir="auto" required />
                <Input aria-label={t("mDue")} type="date" value={m.dueDate} min={start} max={end} onChange={(e) => setM(i, { dueDate: e.target.value })} dir="ltr" required />
                <Input aria-label={t("mAmount")} type="number" min={0} step="0.001" value={m.amountJod} onChange={(e) => setM(i, { amountJod: e.target.value })} dir="ltr" required />
              </div>
              <Textarea aria-label={t("mChecks")} value={m.checks} onChange={(e) => setM(i, { checks: e.target.value })} placeholder={t("mChecksPh")} rows={3} dir="auto" />
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMilestones([...milestones, { title: t("milestone", { n: milestones.length + 1 }), dueDate: end, amountJod: "", checks: "" }])}
            className="flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Plus className="size-4" /> {t("addMilestone")}
          </button>
          <p className="font-semibold tabular-nums" data-testid="contract-total">{t("total", { amount: `${sum.toLocaleString("en", { maximumFractionDigits: 3 })} ${currency}` })}</p>
        </div>
      </Step>

      <Step n={6} title={t("s6")} hint={t("s6hint")}>
        <ul className="space-y-2">
          {requests.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <Input aria-label={t("request")} value={r.text} onChange={(e) => setRequests(requests.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className="min-w-48 flex-1" dir="auto" />
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                {t("inMilestone")}
                <select value={r.milestone} onChange={(e) => setRequests(requests.map((x, j) => (j === i ? { ...x, milestone: Number(e.target.value) } : x)))} className="h-9 rounded-md border bg-background px-2 text-sm">
                  {(milestones.length ? milestones : [{ title: t("milestone", { n: 1 }) }]).map((m, j) => (
                    <option key={j} value={j}>{m.title || t("milestone", { n: j + 1 })}</option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => setRequests(requests.filter((_, j) => j !== i))} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label={t("removeMilestone")}>
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setRequests([...requests, { text: "", milestone: 0 }])} className="flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-sm hover:bg-muted">
          <Plus className="size-4" /> {t("addRequest")}
        </button>
        <div className="grid gap-1.5">
          <Label htmlFor="c-terms">{tl("clientTerms")}</Label>
          <Textarea id="c-terms" value={clientTerms} onChange={(e) => setClientTerms(e.target.value)} placeholder={tl("clientTermsPh")} rows={2} maxLength={3000} dir="auto" data-testid="client-terms" />
        </div>
      </Step>

      <Step n={7} title={t("results.title")} hint={t("results.hint")}>
        <ul className="space-y-2" data-testid="kpi-rows">
          {kpis.map((k, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <Input aria-label={t("results.kpi")} placeholder={t("results.kpiPh")} value={k.label} onChange={(e) => setKpis(kpis.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className="min-w-40 flex-1" dir="auto" />
              <Input aria-label={t("results.target")} placeholder={t("results.targetPh")} value={k.target} onChange={(e) => setKpis(kpis.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))} className="w-40" dir="auto" />
              <button type="button" onClick={() => setKpis(kpis.filter((_, j) => j !== i))} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label={t("removeMilestone")}>
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        {kpis.length < 6 && (
          <button type="button" onClick={() => setKpis([...kpis, { label: "", target: "" }])} className="flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-sm hover:bg-muted" data-testid="add-kpi">
            <Plus className="size-4" /> {t("results.addKpi")}
          </button>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("results.cadence")}</span>
            <select value={cadence} onChange={(e) => setCadence(e.target.value)} className="h-10 rounded-lg border bg-background px-2" data-testid="cadence">
              {(["weekly", "biweekly", "monthly"] as const).map((c) => (
                <option key={c} value={c}>{t(`results.cadences.${c}`)}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("results.media")}</span>
            <Input type="number" min={0} value={mediaBudget} onChange={(e) => setMediaBudget(e.target.value)} placeholder="0" dir="ltr" />
            <span className="text-xs text-muted-foreground">{t("results.mediaHint")}</span>
          </label>
        </div>
        <ul className="space-y-1.5 rounded-xl bg-brand/5 p-3 text-sm">
          <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />{t("results.ownership")}</li>
          <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />{t("results.noSurprises")}</li>
        </ul>
      </Step>

      <Step n={8} title={tl("paymentTitle")}>
        <div className="space-y-1 rounded-xl border-2 border-brand bg-brand/5 p-4" data-testid="guaranteed-payment">
          <span className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5 text-brand" /> {tl("paymentHeading")}
          </span>
          <span className="block text-sm text-muted-foreground">{tl("paymentBody")}</span>
          <span className="block text-xs text-muted-foreground">{tl("paymentFee", { fee: feePercent })}</span>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="a-terms">{tl("agencyTerms")}</Label>
          <Textarea id="a-terms" value={agencyTerms} onChange={(e) => setAgencyTerms(e.target.value)} placeholder={tl("agencyTermsPh")} rows={3} maxLength={3000} dir="auto" data-testid="agency-terms" />
          <span className="text-xs text-muted-foreground">{tl("agencyTermsHint")}</span>
        </div>
      </Step>

      <Step n={9} title={t("s8")}>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={nda} onChange={(e) => setNda(e.target.checked)} className="size-4 accent-[var(--brand)]" data-testid="nda-toggle" />
          {t("nda")}
        </label>
        {nda && (
          <>
            <label className="flex items-center gap-2 text-sm">
              {tl("ndaYears")}
              <select value={ndaYears} onChange={(e) => setNdaYears(Number(e.target.value))} className="h-9 rounded-md border bg-background px-2" data-testid="nda-years">
                {[1, 2, 3, 5].map((n) => (
                  <option key={n} value={n}>{tl("years", { n })}</option>
                ))}
              </select>
            </label>
            <Textarea aria-label={t("ndaExtra")} placeholder={t("ndaExtra")} value={ndaExtra} onChange={(e) => setNdaExtra(e.target.value)} rows={2} dir="auto" />
          </>
        )}
      </Step>

      <Step n={10} title={t("s9")}>
        <div className="grid gap-1.5">
          <Label htmlFor="c-signer">{t("signer")}</Label>
          <Input id="c-signer" value={signer} onChange={(e) => setSigner(e.target.value)} required minLength={3} className="font-serif text-lg italic" dir="auto" />
        </div>
        <SignaturePad name="signature" label={tl("drawSignature")} clearLabel={tl("clear")} hint={tl("drawHint")} required requiredMessage={tl("drawRequired")} />
        <p className="text-xs text-muted-foreground">{tl("lawNote", { country: countryName })}</p>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" />
          {tl("agencyDeclaration", { agency: agencyName })}
        </label>
        <FormError message={state?.error ? t(`errors.${state.error}` as "errors.invalid") : undefined} />
        <SubmitButton className="h-11 w-full sm:w-auto">{t("submit")}</SubmitButton>
      </Step>
    </form>
  );
}
