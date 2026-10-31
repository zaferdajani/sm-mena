import { PauseCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** In the Studio while Sawwiq's team has paused the page: what that means and where to ask (never a silent suspension). */
export async function SuspendedNotice({ status }: { status: string }) {
  if (status !== "suspended") return null;
  const t = await getTranslations("Studio.suspended");
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm" data-testid="suspended-notice">
      <PauseCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
      <div>
        <p className="font-semibold">{t("title")}</p>
        <p className="mt-1 text-muted-foreground">{t("body")}</p>
        <Link href="/support" className="mt-2 inline-block font-medium text-brand underline underline-offset-4">{t("ask")}</Link>
      </div>
    </div>
  );
}
