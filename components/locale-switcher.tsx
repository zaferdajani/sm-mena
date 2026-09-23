"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";

export function LocaleSwitcher({ label, ariaLabel }: { label: string; ariaLabel: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const target = locale === "ar" ? "en" : "ar";
  const query = Object.fromEntries(search.entries());

  return (
    <Link
      href={{ pathname, query }}
      locale={target}
      aria-label={ariaLabel}
      data-testid="locale-switcher"
      className="inline-flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm hover:bg-muted"
    >
      <Languages className="size-4" />
      {label}
    </Link>
  );
}
