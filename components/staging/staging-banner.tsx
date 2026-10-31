import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isStagingMode } from "@/lib/core/rules/staging";
import { StagingBannerOffset } from "./banner-offset";

/** Visible on every page of a staging deployment. Hidden everywhere else, including production. */
export async function StagingBanner() {
  if (!isStagingMode()) return null;
  const t = await getTranslations("Staging");
  return (
    <div role="status" data-testid="staging-banner" className="sticky top-0 z-50 border-b border-black/20 bg-amber-400 px-3 py-2 text-center text-sm font-semibold text-black">
      <StagingBannerOffset />
      <p>{t("banner")}</p>
      <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-medium">
        <Link href="/wallet" className="underline underline-offset-2">{t("wallet")}</Link>
        <Link href="/login" className="underline underline-offset-2">{t("signIn")}</Link>
        <Link href="/owner" className="underline underline-offset-2">{t("owners")}</Link>
        <Link href="/admin" className="underline underline-offset-2">{t("admin")}</Link>
      </p>
    </div>
  );
}
