import { Construction } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { FeatureKey } from "@/lib/features";

/** Shown instead of a feature that is switched to "Coming soon" (Admin → Features). */
export async function ComingSoon({ feature, compact = false }: { feature: FeatureKey; compact?: boolean }) {
  const t = await getTranslations("Features");
  if (compact) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground" data-testid="coming-soon" data-feature={feature}>
        <Construction className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <b className="text-foreground">{t(`items.${feature}.name`)}</b> · {t("soonShort")}
        </span>
      </p>
    );
  }
  return (
    <section className="mx-auto max-w-md space-y-3 px-4 py-16 text-center" data-testid="coming-soon" data-feature={feature}>
      <Construction className="mx-auto size-10 text-brand" aria-hidden="true" />
      <h1 className="text-xl font-bold">{t(`items.${feature}.name`)}</h1>
      <p className="text-sm font-medium text-brand">{t("soonTitle")}</p>
      <p className="text-sm text-muted-foreground">{t(`items.${feature}.soon`)}</p>
      <Link href="/feed" className={buttonVariants({ variant: "outline", className: "mt-2 h-9" })}>
        {t("back")}
      </Link>
    </section>
  );
}
