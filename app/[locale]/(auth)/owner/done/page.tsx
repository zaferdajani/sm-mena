import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { countryName } from "@/lib/core/catalog/countries";
import { getOwnerNeed } from "@/lib/data/owner-needs";

export async function generateMetadata({ params }: PageProps<"/[locale]/owner/done">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OwnerEarly" });
  return { title: t("done.metaTitle"), robots: { index: false } };
}

/** What happens next, stated plainly: no browsing is promised during the registration phase. */
export default async function OwnerDonePage({ params }: PageProps<"/[locale]/owner/done">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getSessionUser();
  if (!user || user.role !== "client") redirect(`/${locale}/owner`);
  const need = await getOwnerNeed(user.id);
  if (!need) redirect(`/${locale}/owner/needs`);
  const t = await getTranslations("OwnerEarly");
  return (
    <div data-testid="owner-done">
      <p className="flex items-center gap-2 text-brand"><CheckCircle2 className="size-6" aria-hidden /><span className="text-sm font-semibold">{t("done.eyebrow")}</span></p>
      <h1 className="mt-2 text-2xl font-extrabold leading-tight">{t("done.title")}</h1>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("done.intro", { country: countryName(need.country, locale) })}</p>
      <ol className="mt-4 grid gap-2 text-sm leading-7" data-testid="owner-next">
        {(["open", "match", "contact"] as const).map((k, i) => (
          <li key={k} className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">{i + 1}</span>{t(`done.next.${k}`)}</li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/owner/needs" className="registration-secondary" data-testid="owner-edit">{t("done.edit")}</Link>
        <Link href="/" className="registration-secondary">{t("done.home")}</Link>
      </div>
    </div>
  );
}
