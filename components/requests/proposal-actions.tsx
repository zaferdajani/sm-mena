"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { closeRequestAction, proposalDecisionAction } from "@/app/[locale]/(main)/request-actions";
import { Button } from "@/components/ui/button";

type Access = { token?: string; requestId?: string };
type Decision = "accepted" | "declined";

/**
 * A decision the owner can't take back asks first, on the page (the browser's own confirm box looked like an
 * error and decline/close used to act on one tap).
 */
function Confirm({ text, yes, onYes, onNo, pending }: { text: string; yes: string; onYes: () => void; onNo: () => void; pending: boolean }) {
  const t = useTranslations("Requests");
  return (
    <div className="grid w-full gap-2 rounded-lg border border-brand-line bg-brand-soft p-3 text-sm" role="alertdialog" aria-label={text} data-testid="confirm-panel">
      <p>{text}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={onYes} data-testid="confirm-yes">{yes}</Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={onNo}>{t("cancel")}</Button>
      </div>
    </div>
  );
}

export function ProposalActions({ access, proposalId, status }: { access: Access; proposalId: string; status: "sent" | "shortlisted" | "accepted" | "declined" }) {
  const t = useTranslations("Requests");
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState<Decision | null>(null);
  const run = (next: "shortlisted" | "accepted" | "declined" | "sent") => start(() => proposalDecisionAction(access, proposalId, next));
  if (status === "accepted" || status === "declined") return null;
  if (asking) {
    return (
      <Confirm
        text={t(asking === "accepted" ? "acceptConfirm" : "declineConfirm")}
        yes={t(asking === "accepted" ? "acceptYes" : "declineYes")}
        onYes={() => run(asking)}
        onNo={() => setAsking(null)}
        pending={pending}
      />
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(status === "shortlisted" ? "sent" : "shortlisted")} data-testid="shortlist">
        {status === "shortlisted" ? t("unshortlist") : t("shortlist")}
      </Button>
      <Button size="sm" disabled={pending} onClick={() => setAsking("accepted")} data-testid="accept">
        {t("accept")}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setAsking("declined")} data-testid="decline">
        {t("decline")}
      </Button>
    </div>
  );
}

export function CloseRequestButton({ access }: { access: Access }) {
  const t = useTranslations("Requests");
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  if (asking) return <Confirm text={t("closeConfirm")} yes={t("closeYes")} onYes={() => start(() => closeRequestAction(access))} onNo={() => setAsking(false)} pending={pending} />;
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => setAsking(true)} data-testid="close-request">
      {t("close")}
    </Button>
  );
}
