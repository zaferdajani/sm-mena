import { FlaskConical } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { exitDemoAction } from "@/app/[locale]/(main)/demo-actions";
import { isDemoMode } from "@/lib/demo";

/** A thin bar on every page while this browser is in the demo (lib/demo.ts). */
export async function DemoBanner() {
  if (!(await isDemoMode())) return null;
  const t = await getTranslations("Demo");
  return (
    <div className="flex items-center justify-center gap-3 bg-amber-100 px-4 py-1.5 text-xs text-amber-950 dark:bg-amber-900/60 dark:text-amber-50" data-testid="demo-banner">
      <FlaskConical className="size-3.5 shrink-0" aria-hidden />
      <span>{t("banner")}</span>
      <form action={exitDemoAction}>
        <button type="submit" className="font-semibold underline underline-offset-2" data-testid="demo-exit">
          {t("exit")}
        </button>
      </form>
    </div>
  );
}
