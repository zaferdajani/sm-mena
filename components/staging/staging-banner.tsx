import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isStagingMode } from "@/lib/core/rules/staging";
import { StagingBannerOffset } from "./banner-offset";

/** Visible on every page of a staging deployment. Hidden everywhere else, including production. */
export async function StagingBanner() {
  if (!isStagingMode()) return null;
  const [t, user] = await Promise.all([getTranslations("Staging"), getSessionUser()]);
  return (
    <div role="status" data-testid="staging-banner" className="sticky top-0 z-50 border-b border-black/20 bg-amber-400 px-3 py-2 text-center text-sm font-semibold text-black">
      <StagingBannerOffset />
      <p>{t("banner")}</p>
      <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-medium">
        <Link href="/wallet" className="underline underline-offset-2">{t("wallet")}</Link>
        {/* Signed in already: no "Sign in" link (QA L-09). */}
        {!user && <Link href="/login" className="underline underline-offset-2" data-testid="staging-signin">{t("signIn")}</Link>}
        <Link href="/owner" className="underline underline-offset-2">{t("owners")}</Link>
        <Link href="/admin" className="underline underline-offset-2">{t("admin")}</Link>
      </p>
    </div>
  );
}
