"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { closeRequestAction, proposalDecisionAction } from "@/app/[locale]/(main)/request-actions";
import { Button } from "@/components/ui/button";

type Access = { token?: string; requestId?: string };

export function ProposalActions({ access, proposalId, status }: { access: Access; proposalId: string; status: "sent" | "shortlisted" | "accepted" | "declined" }) {
  const t = useTranslations("Requests");
  const [pending, start] = useTransition();
  const run = (next: "shortlisted" | "accepted" | "declined" | "sent") => start(() => proposalDecisionAction(access, proposalId, next));
  if (status === "accepted" || status === "declined") return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(status === "shortlisted" ? "sent" : "shortlisted")} data-testid="shortlist">
        {status === "shortlisted" ? t("unshortlist") : t("shortlist")}
      </Button>
      <Button size="sm" disabled={pending} onClick={() => window.confirm(t("acceptConfirm")) && run("accepted")} data-testid="accept">
        {t("accept")}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("declined")}>
        {t("decline")}
      </Button>
    </div>
  );
}

export function CloseRequestButton({ access }: { access: Access }) {
  const t = useTranslations("Requests");
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => start(() => closeRequestAction(access))}>
      {t("close")}
    </Button>
  );
}
