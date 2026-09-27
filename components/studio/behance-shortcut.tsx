import { ArrowRight, Palette } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { canUse } from "@/lib/feature-gate";
import { cn } from "@/lib/utils";

/**
 * The Behance import offered where a new provider decides how to start (docs/47):
 * the profile welcome, the packages step, the setup list and the new-post page.
 * Renders nothing while the portfolio_import switch is off or "soon".
 */
export async function BehanceShortcut({ testId, className, compact = false }: { testId: string; className?: string; compact?: boolean }) {
  if (!(await canUse("portfolio_import"))) return null;
  const t = await getTranslations("BehanceImport.shortcut");
  if (compact) {
    return (
      <Link href="/studio/import/behance" className={cn("inline-flex items-center gap-1.5 font-medium text-brand underline-offset-4 hover:underline", className)} data-testid={testId}>
        <Palette className="size-4" aria-hidden /> {t("cta")}
      </Link>
    );
  }
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-brand-line bg-background p-4 text-sm sm:flex-row sm:items-center", className)} data-testid={testId}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
        <Palette className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block">{t("title")}</b>
        <span className="text-muted-foreground">{t("body")}</span>{" "}
        <Link href="/studio/import" className="text-muted-foreground underline underline-offset-4 hover:text-foreground" data-testid={`${testId}-pdf`}>{t("pdf")}</Link>
      </span>
      <Link href="/studio/import/behance" className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 font-medium text-white hover:bg-brand-deep" data-testid={`${testId}-link`}>
        {t("cta")} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
      </Link>
    </div>
  );
}
