"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LocaleSwitcher({
  label,
  ariaLabel,
}: {
  label: string;
  ariaLabel: string;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const target = locale === "ar" ? "en" : "ar";

  return (
    <Link
      href={pathname}
      locale={target}
      aria-label={ariaLabel}
      data-testid="locale-switcher"
      className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
    >
      {label}
    </Link>
  );
}
