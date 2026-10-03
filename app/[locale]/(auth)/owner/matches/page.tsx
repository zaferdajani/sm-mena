import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MatchCard } from "./match-card";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { countryName } from "@/lib/core/catalog/countries";
import { SERVICE_GROUPS } from "@/lib/core/catalog/services/catalog";
import { listOwnerMatches, visibleToOwner } from "@/lib/data/owner-matching";
import { getOwnerNeed } from "@/lib/data/owner-needs";
import { isRegistrationPhase } from "@/lib/launch-phase";

export async function generateMetadata({ params }: PageProps<"/[locale]/owner/matches">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OwnerMatches" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** The owner's matches (docs/59): shown only once sent; each one is accepted or declined by the owner. */
export default async function OwnerMatchesPage({ params }: PageProps<"/[locale]/owner/matches">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getSessionUser();
  if (!user || user.role !== "client") redirect(`/${locale}/owner`);
  const need = await getOwnerNeed(user.id);
  if (!need) redirect(`/${locale}/owner/needs`);
  const t = await getTranslations("OwnerMatches");
  const matches = (await listOwnerMatches(user.id)).filter(visibleToOwner);
  const groupLabel = (key: string) => { const g = SERVICE_GROUPS.find((x) => x.key === key); return g ? (locale === "ar" ? g.name_ar : g.name_en) : key; };
  const open = matches.filter((m) => m.status === "sent");
  const answered = matches.filter((m) => m.status !== "sent");
  return (
    <div data-testid="owner-matches">
      <p className="text-xs text-muted-foreground">{t("signedInAs")} <bdi dir="ltr">{user.email}</bdi></p>
      <h1 className="mt-1 text-2xl font-extrabold leading-tight">{t("title")}</h1>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("intro", { city: need.city, country: countryName(need.country, locale) })}</p>
      {!matches.length && (
        <div className="mt-5 rounded-xl border bg-brand-soft/60 p-4 text-sm leading-7" data-testid="owner-matches-empty">
          <p className="font-semibold">{t(isRegistrationPhase() ? "empty.closedTitle" : "empty.openTitle")}</p>
          <p className="text-muted-foreground">{t(isRegistrationPhase() ? "empty.closedBody" : "empty.openBody")}</p>
        </div>
      )}
      {open.length > 0 && (
        <section className="mt-5 grid gap-3" aria-label={t("openTitle")} data-testid="owner-matches-open">
          <h2 className="text-sm font-semibold">{t("openTitle")}</h2>
          {open.map((m) => <MatchCard key={m.id} match={{ id: m.id, status: m.status, reasons: m.reasons, agency: { ...m.agency, serviceLabels: Array.from(new Set(m.agency.services.map(groupLabel))).slice(0, 4) } }} />)}
        </section>
      )}
      {answered.length > 0 && (
        <section className="mt-6 grid gap-3" aria-label={t("answeredTitle")} data-testid="owner-matches-answered">
          <h2 className="text-sm font-semibold">{t("answeredTitle")}</h2>
          {answered.map((m) => <MatchCard key={m.id} match={{ id: m.id, status: m.status, reasons: m.reasons, agency: { ...m.agency, serviceLabels: Array.from(new Set(m.agency.services.map(groupLabel))).slice(0, 4) } }} />)}
        </section>
      )}
      <p className="mt-6 text-xs leading-6 text-muted-foreground">{t("privacy")}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/owner/needs" className="registration-secondary" data-testid="owner-matches-edit">{t("editNeeds")}</Link>
        <Link href="/" className="registration-secondary">{t("home")}</Link>
      </div>
    </div>
  );
}
