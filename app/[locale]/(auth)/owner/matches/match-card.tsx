"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { answerOwnerMatchAction, type MatchAnswerState } from "@/app/[locale]/(auth)/owner-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

type Match = { id: string; status: string; reasons: string[]; agency: { handle: string; name: string; city: string; kind: string; postCount: number; serviceLabels: string[] } };

/** One provider match: who they are, why they fit, and the owner's two buttons. Acceptance is the consent (docs/59). */
export function MatchCard({ match }: { match: Match }) {
  const t = useTranslations("OwnerMatches");
  const [state, action] = useActionState<MatchAnswerState, FormData>(answerOwnerMatchAction, undefined);
  const status = state?.done === "accepted" ? "introduced" : state?.done === "declined" ? "declined" : match.status;
  return (
    <article className="rounded-xl border bg-card p-4" data-testid="owner-match" data-status={status}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold" dir="auto">{match.agency.name}</h3>
          <p className="text-xs text-muted-foreground">{t(`kind.${match.agency.kind === "freelancer" ? "freelancer" : "agency"}`)} · {match.agency.city}</p>
        </div>
        {status !== "sent" && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium" data-testid="owner-match-status">{t(`status.${status}`)}</span>}
      </div>
      {match.agency.serviceLabels.length > 0 && <p className="mt-2 text-sm text-muted-foreground">{match.agency.serviceLabels.join(" · ")}</p>}
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {match.reasons.map((r) => <li key={r} className="rounded-full border px-2 py-0.5 text-xs">{t(`reasons.${r}`)}</li>)}
      </ul>
      {status === "sent" && (
        <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="matchId" value={match.id} />
          <SubmitButton name="answer" value="accept" testId="owner-match-accept">{t("accept")}</SubmitButton>
          <SubmitButton name="answer" value="decline" variant="ghost" testId="owner-match-decline">{t("decline")}</SubmitButton>
          <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
        </form>
      )}
      {status === "introduced" && <p className="mt-3 text-sm text-brand" data-testid="owner-match-introduced">{t("introducedNote", { name: match.agency.name })}</p>}
    </article>
  );
}
