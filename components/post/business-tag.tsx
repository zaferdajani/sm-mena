"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BUSINESS_EMOJI, isBusinessType } from "@/lib/business-types";
import { cn } from "@/lib/utils";

/** The post's business type; opens the feed with only that type. */
export function BusinessTag({ type, className }: { type: string | null; className?: string }) {
  const t = useTranslations("Industries");
  if (!isBusinessType(type)) return null;
  return (
    <Link
      href={{ pathname: "/feed", query: { type } }}
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", className ?? "bg-brand-soft text-brand")}
      data-testid="business-tag"
    >
      <span aria-hidden>{BUSINESS_EMOJI[type]}</span>
      {t(type)}
    </Link>
  );
}
