"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
  removeDemoAction,
  setDemoHiddenAction,
  resolveReportAction,
  setPostStatusAction,
  setPromotionStatusAction,
  setReviewStatusAction,
  setStatusAction,
  setVerifiedAction,
} from "@/app/[locale]/(main)/admin/actions";
import { Button } from "@/components/ui/button";

function ActionButton({ onRun, children, variant = "outline", testId }: { onRun: () => Promise<unknown>; children: React.ReactNode; variant?: "outline" | "destructive" | "default" | "secondary"; testId?: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant={variant} disabled={pending} data-testid={testId} onClick={() => start(async () => void (await onRun()))}>
      {children}
    </Button>
  );
}

export function AgencyAdminButtons({ id, verified, status }: { id: string; verified: boolean; status: "active" | "suspended" }) {
  const t = useTranslations("Admin");
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton onRun={() => setVerifiedAction(id, !verified)} variant={verified ? "outline" : "default"} testId="verify-toggle">
        {verified ? t("unverify") : t("verify")}
      </ActionButton>
      <ActionButton onRun={() => setStatusAction(id, status === "active" ? "suspended" : "active")} variant={status === "active" ? "destructive" : "secondary"}>
        {status === "active" ? t("suspend") : t("activate")}
      </ActionButton>
    </div>
  );
}

export function RemoveDemoButton() {
  const t = useTranslations("Admin");
  const [done, setDone] = useState<number | null>(null);
  return done !== null ? (
    <p className="text-sm">{t("removedDemo", { count: done })}</p>
  ) : (
    <ActionButton
      variant="destructive"
      onRun={async () => {
        if (window.confirm(t("removeDemoConfirm"))) setDone(await removeDemoAction());
      }}
    >
      {t("removeDemo")}
    </ActionButton>
  );
}

/** Hides or shows the demo agencies on the main site; /demo keeps them either way (lib/demo.ts). */
export function DemoOnMainButton({ hidden }: { hidden: boolean }) {
  const t = useTranslations("Admin");
  return (
    <ActionButton variant="outline" onRun={() => setDemoHiddenAction(!hidden)} testId="demo-on-main">
      {t(hidden ? "showDemoOnMain" : "hideDemoOnMain")}
    </ActionButton>
  );
}

export function ReportButtons({ id, postId, hidden }: { id: string; postId: string | null; hidden: boolean }) {
  const t = useTranslations("Admin");
  return (
    <div className="flex flex-wrap gap-2">
      {!hidden && <ActionButton variant="destructive" onRun={() => resolveReportAction(id, "hide")}>{t("hidePost")}</ActionButton>}
      {hidden && postId && <ActionButton onRun={() => setPostStatusAction(postId, "published")}>{t("unhide")}</ActionButton>}
      <ActionButton onRun={() => resolveReportAction(id, "dismiss")}>{t("dismiss")}</ActionButton>
    </div>
  );
}

export function PromotionButtons({ id, status }: { id: string; status: "active" | "paused" | "ended" }) {
  const t = useTranslations("Admin.promo");
  if (status === "ended") return null;
  return (
    <div className="flex gap-2">
      <ActionButton onRun={() => setPromotionStatusAction(id, status === "active" ? "paused" : "active")}>
        {status === "active" ? t("pause") : t("resume")}
      </ActionButton>
      <ActionButton variant="destructive" onRun={() => setPromotionStatusAction(id, "ended")}>{t("end")}</ActionButton>
    </div>
  );
}

export function ReviewStatusButton({ id, status }: { id: string; status: "published" | "hidden" }) {
  const t = useTranslations("Reviews.admin");
  return (
    <ActionButton variant={status === "published" ? "destructive" : "outline"} onRun={() => setReviewStatusAction(id, status === "published" ? "hidden" : "published")}>
      {status === "published" ? t("hide") : t("show")}
    </ActionButton>
  );
}
