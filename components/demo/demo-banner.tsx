import { FlaskConical } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { demoMode } from "@/lib/demo-mode";
import { DemoToggle } from "./demo-toggle";

/** Shown on every page while the demo view is on, with a way out. */
export async function DemoBanner() {
  if (!(await demoMode())) return null;
  const t = await getTranslations("Demo");
  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100" data-testid="demo-banner">
      <span className="flex items-center gap-1.5">
        <FlaskConical className="size-4 shrink-0" aria-hidden="true" />
        {t("bannerOn")}
      </span>
      <DemoToggle on={false} label={t("exit")} className="rounded-full border border-current px-2.5 py-0.5 font-medium hover:bg-amber-100 dark:hover:bg-amber-900" />
    </div>
  );
}

/** A sample agency's own pages say so, whether or not the demo view is on. */
export async function DemoNotice({ kind }: { kind: "agency" | "post" }) {
  const t = await getTranslations("Demo");
  return (
    <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100" data-testid="demo-notice">
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {t(kind === "agency" ? "sampleAgency" : "samplePost")}
    </p>
  );
}
