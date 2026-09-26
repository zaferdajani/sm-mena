"use client";

import { Handshake, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { cancelShareAction, proposeShareAction, sharePaidAction } from "@/app/[locale]/(main)/share-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { SHAREABLE_STATUSES } from "@/lib/contracts/shares";
import { formatFils } from "@/lib/format";

type Share = { id: string; status: string; kind: string; percent: number | null; amountFils: number; paidByAgencyAt: Date | null; receivedByPartnerAt: Date | null };
type Row = { id: string; title: string; status: string; amountFils: number; share: (Share & { partner: { name: string; handle: string } }) | null };
type Props = { contractId: string; currency: string; mode: "protected" | "direct"; active: boolean; milestones: Row[]; partners: { id: string; name: string; handle: string }[] };

function ProposeForm({ contractId, milestone, partners, currency }: { contractId: string; milestone: Row; partners: Props["partners"]; currency: string }) {
  const t = useTranslations("Shares");
  const [state, action] = useActionState(proposeShareAction, undefined);
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  return (
    <form action={action} className="mt-2 grid gap-3 rounded-xl bg-muted/50 p-3" data-testid={`share-form-${milestone.id}`}>
      <input type="hidden" name="contractId" value={contractId} />
      <input type="hidden" name="milestoneId" value={milestone.id} />
      <div className="grid gap-1.5">
        <Label htmlFor={`partner-${milestone.id}`}>{t("partner")}</Label>
        <select id={`partner-${milestone.id}`} name="partnerId" required className="h-9 rounded-md border bg-background px-2 text-sm">
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (@{p.handle})
            </option>
          ))}
        </select>
      </div>
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="sr-only">{t("kind")}</legend>
        {(["percent", "fixed"] as const).map((k) => (
          <label key={k} className="flex items-center gap-1.5">
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
            {t(`kinds.${k}`)}
          </label>
        ))}
      </fieldset>
      {kind === "percent" ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`pct-${milestone.id}`}>{t("percentOf", { amount: formatFils(milestone.amountFils, "en", currency) })}</Label>
          <Input id={`pct-${milestone.id}`} name="percent" type="number" min={1} max={100} required dir="ltr" className="max-w-28" />
        </div>
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor={`amt-${milestone.id}`}>{t("amountIn", { currency })}</Label>
          <Input id={`amt-${milestone.id}`} name="amount" type="number" min={1} step="0.001" required dir="ltr" className="max-w-36" />
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor={`note-${milestone.id}`}>{t("note")}</Label>
        <Input id={`note-${milestone.id}`} name="note" maxLength={500} placeholder={t("notePlaceholder")} />
      </div>
      <FormError message={state?.error ? t(`errors.${state.error}` as "errors.invalid") : undefined} />
      {state?.ok && <p role="status" className="text-sm font-medium text-brand">{t("sent")}</p>}
      <SubmitButton className="w-fit">{t("propose")}</SubmitButton>
    </form>
  );
}

/**
 * The agency's contract page: bring a freelancer or partner agency in on a
 * milestone for a share of it (docs/40). The partner is paid its share
 * directly when the client confirms that milestone.
 */
export function MilestonePartners({ contractId, currency, mode, active, milestones, partners }: Props) {
  const t = useTranslations("Shares");
  const locale = useLocale();
  const money = (f: number) => formatFils(f, locale, currency);
  return (
    <section className="space-y-3 rounded-2xl border p-4" data-testid="milestone-partners">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <Handshake className="size-4 text-brand" /> {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t(mode === "protected" ? "introProtected" : "introDirect")}</p>
      </div>
      <ul className="divide-y">
        {milestones.map((m) => {
          const s = m.share;
          const canAdd = active && !s && (SHAREABLE_STATUSES as readonly string[]).includes(m.status);
          return (
            <li key={m.id} className="py-3 text-sm" data-testid={`share-row-${m.id}`}>
              <p className="font-medium" dir="auto">{m.title}</p>
              {s ? (
                <div className="mt-1 space-y-2">
                  <p>
                    {t("line", { name: s.partner.name, share: s.kind === "percent" ? `${s.percent}%` : money(s.amountFils), amount: money(s.amountFils) })}{" "}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]" data-testid="share-status">{t(`status.${s.status}` as "status.proposed")}</span>
                  </p>
                  {s.status === "proposed" && (
                    <form action={cancelShareAction}>
                      <input type="hidden" name="shareId" value={s.id} />
                      <SubmitButton variant="outline" className="h-8 text-xs">{t("withdraw")}</SubmitButton>
                    </form>
                  )}
                  {s.status === "accepted" && mode === "direct" && ["approved", "released"].includes(m.status) && (
                    s.paidByAgencyAt ? (
                      <p className="text-xs text-muted-foreground">{s.receivedByPartnerAt ? t("directReceived") : t("directPaid")}</p>
                    ) : (
                      <form action={sharePaidAction}>
                        <input type="hidden" name="shareId" value={s.id} />
                        <SubmitButton variant="outline" className="h-8 text-xs">{t("markPaid", { amount: money(s.amountFils) })}</SubmitButton>
                      </form>
                    )
                  )}
                </div>
              ) : canAdd ? (
                partners.length ? (
                  <details className="mt-1">
                    <summary className="flex cursor-pointer items-center gap-1.5 text-brand">
                      <UserPlus className="size-4" /> {t("add")}
                    </summary>
                    <ProposeForm contractId={contractId} milestone={m} partners={partners} currency={currency} />
                  </details>
                ) : (
                  <Link href="/studio/partners" className="mt-1 inline-block text-brand">{t("findPartners")}</Link>
                )
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">{t("agencyOnly")}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
