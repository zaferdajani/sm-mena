"use client";

import { Briefcase, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

const ROLE_KEY = "sw_role";

/**
 * First visit to the front page: one question, "who are you?". Businesses go
 * to the guided matcher (it asks what they need, platforms, budget, city);
 * agencies go to the short sign-up. Asked once per device; never rendered on
 * the server, so search engines and returning visitors see the page as is.
 */
export function WelcomeChooser() {
  const t = useTranslations("Welcome");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(ROLE_KEY)) setOpen(true);
    } catch {
      // Storage blocked: don't nag on every visit.
    }
  }, []);
  const remember = (role: string) => {
    try {
      localStorage.setItem(ROLE_KEY, role);
    } catch {
      // ignore
    }
    setOpen(false);
  };
  if (!open) return null;
  const card = "flex items-center gap-3 rounded-2xl border bg-card p-4 text-start shadow-sm transition-colors hover:border-brand hover:bg-brand-soft";
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="welcome-title" data-testid="welcome-chooser">
      <div className="w-full max-w-md rounded-3xl bg-background p-5 shadow-xl">
        <div className="mb-4 flex items-start gap-2">
          <div className="flex-1">
            <h2 id="welcome-title" className="font-heading text-xl font-bold">{t("title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <button type="button" onClick={() => remember("browse")} aria-label={t("close")} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid gap-3">
          <Link href="/match" onClick={() => remember("client")} className={card} data-testid="welcome-client">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white"><Search className="size-5" /></span>
            <span>
              <span className="block font-semibold">{t("client")}</span>
              <span className="block text-sm text-muted-foreground">{t("clientHint")}</span>
            </span>
          </Link>
          <Link href="/join" onClick={() => remember("agency")} className={card} data-testid="welcome-agency">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-deep text-white"><Briefcase className="size-5" /></span>
            <span>
              <span className="block font-semibold">{t("agency")}</span>
              <span className="block text-sm text-muted-foreground">{t("agencyHint")}</span>
            </span>
          </Link>
          <button type="button" onClick={() => remember("browse")} className="py-1 text-sm font-medium text-brand" data-testid="welcome-browse">
            {t("browse")}
          </button>
        </div>
      </div>
    </div>
  );
}
