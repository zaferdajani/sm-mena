"use client";

import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import { ANALYTICS_EVENT, ANALYTICS_KEY, gaMeasurementId, gaScriptUrl, mayLoadAnalytics, parseChoice, type AnalyticsChoice } from "@/lib/analytics-consent";

const GA_ID = gaMeasurementId(process.env.NEXT_PUBLIC_GA_ID);

const subscribe = (notify: () => void) => {
  window.addEventListener(ANALYTICS_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(ANALYTICS_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
};
// "loading" on the server and during hydration, so the banner never flashes for someone who already chose.
const read = (): AnalyticsChoice | "none" => {
  try {
    return parseChoice(localStorage.getItem(ANALYTICS_KEY)) ?? "none";
  } catch {
    return "none";
  }
};
const useChoice = () => useSyncExternalStore(subscribe, read, () => "loading" as const);

function save(choice: "accepted" | "rejected" | "reset") {
  try {
    if (choice === "reset") localStorage.removeItem(ANALYTICS_KEY);
    else localStorage.setItem(ANALYTICS_KEY, choice);
  } catch {
    // Storage blocked: the choice lasts for this page view only and analytics stays off.
  }
  window.dispatchEvent(new Event(ANALYTICS_EVENT));
}

function loadGoogleAnalytics(id: string) {
  if (document.getElementById("ga-script")) return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  const gtag = (...args: unknown[]) => { w.dataLayer!.push(args); };
  gtag("js", new Date());
  gtag("config", id, { anonymize_ip: true });
  const s = document.createElement("script");
  s.id = "ga-script";
  s.async = true;
  s.src = gaScriptUrl(id);
  document.head.appendChild(s);
}

/** Cookie banner with equal Accept and Reject buttons. Renders nothing, and loads nothing, when no GA id is configured. */
export function AnalyticsConsent() {
  const t = useTranslations("AnalyticsConsent");
  const choice = useChoice();
  const choiceKnown = choice === "accepted" || choice === "rejected";
  useEffect(() => {
    if (mayLoadAnalytics(GA_ID, choice === "accepted" ? "accepted" : null)) loadGoogleAnalytics(GA_ID!);
  }, [choice]);
  if (!GA_ID || choice === "loading" || choiceKnown) return null;
  const btn = "inline-flex h-10 min-w-28 flex-1 items-center justify-center rounded-lg border px-4 text-sm font-semibold hover:bg-muted";
  return (
    <div role="dialog" aria-label={t("label")} className="fixed inset-x-0 bottom-0 z-[90] border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg" data-testid="analytics-consent">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <p className="text-sm">
          {t("text")} <Link href="/privacy" className="underline">{t("privacy")}</Link>
        </p>
        <div className="flex gap-3">
          <button type="button" className={btn} onClick={() => save("rejected")} data-testid="analytics-reject">{t("reject")}</button>
          <button type="button" className={btn} onClick={() => save("accepted")} data-testid="analytics-accept">{t("accept")}</button>
        </div>
      </div>
    </div>
  );
}

/** Footer link that reopens the choice. Shown only when analytics is configured. */
export function CookieSettingsLink() {
  const t = useTranslations("AnalyticsConsent");
  if (!GA_ID) return null;
  return (
    <button type="button" className="text-start text-muted-foreground hover:underline" onClick={() => save("reset")} data-testid="cookie-settings">
      {t("link")}
    </button>
  );
}
