"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { LANG_COOKIE } from "@/i18n/routing";

/** A plain text link to this same page in the other language (the footer's). */
export function OtherLanguageLink({ label, className }: { label: string; className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const target = locale === "ar" ? "en" : "ar";
  return (
    <Link
      href={{ pathname, query: Object.fromEntries(search.entries()) }}
      locale={target}
      hrefLang={target}
      className={className}
      data-testid="footer-language"
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${target}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      }}
    >
      {label}
    </Link>
  );
}
