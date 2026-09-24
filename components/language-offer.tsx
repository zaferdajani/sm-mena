"use client";

import { Globe, X } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { isRtl, languageOf } from "@/i18n/languages";
import { LANG_COOKIE, OFFER_COOKIE, routing } from "@/i18n/routing";
import { visitorCountry } from "@/lib/i18n/country";
import { suggestLocale } from "@/lib/i18n/suggest";

type OfferText = { text: string; switch: string; dismiss: string };

const readCookie = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.split("=")[1] ?? null;
const writeCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
};

/**
 * "سوّق متاح بالعربية — اعرضه بالعربية" as one line at the top, the way
 * browsers offer a translation (ported from OneClickConvert). Written in the
 * language being offered; ✕ keeps the current one. Asked at most once: the
 * answer is remembered, and a visitor who already chose a language is never
 * asked.
 */
export function LanguageOffer({ texts }: { texts: Record<string, OfferText> }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      if (readCookie(LANG_COOKIE) || readCookie(OFFER_COOKIE)) return;
      setSuggestion(
        suggestLocale({ current: locale, enabled: routing.locales, browserLanguages: navigator.languages ?? [navigator.language], country: visitorCountry() }),
      );
    }, 0);
    return () => clearTimeout(id);
  }, [locale]);

  const offer = suggestion ? texts[suggestion] : null;
  if (!suggestion || !offer) return null;
  const dir = isRtl(suggestion) ? "rtl" : "ltr";

  const accept = () => {
    writeCookie(OFFER_COOKIE, "yes");
    writeCookie(LANG_COOKIE, suggestion);
    setSuggestion(null);
    router.replace(pathname, { locale: suggestion as (typeof routing.locales)[number] });
  };
  const decline = () => {
    writeCookie(OFFER_COOKIE, "no");
    setSuggestion(null);
  };

  return (
    <div className="flex items-center gap-2 border-b bg-brand/5 px-4 py-1.5 text-sm" role="region" aria-label={languageOf(suggestion)?.label} data-testid="language-offer">
      <Globe className="size-4 shrink-0 text-brand" />
      <p className="min-w-0 flex-1 truncate" lang={suggestion} dir={dir}>
        {offer.text}{" "}
        <button type="button" onClick={accept} className="font-semibold text-brand underline-offset-4 hover:underline" data-testid="language-offer-accept">
          {offer.switch}
        </button>
      </p>
      <button type="button" onClick={decline} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label={texts[locale]?.dismiss ?? "✕"}>
        <X className="size-4" />
      </button>
    </div>
  );
}
