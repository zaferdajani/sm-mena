import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgencyAvatar } from "@/components/agency-avatar";
import { Link } from "@/i18n/navigation";
import { COUNTRIES } from "@/lib/countries";
import { currentCountry } from "@/lib/country-choice";
import { topAgencies } from "@/lib/data/top";
import { pageMeta } from "@/lib/seo";

const countryName = (code: string, locale: string) => {
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? (locale === "ar" ? c.ar : c.en) : code;
};

export async function generateMetadata({ params }: PageProps<"/[locale]/sawwiq50">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Top" });
  const country = countryName(await currentCountry(), locale);
  return pageMeta({ locale, path: "/sawwiq50", title: t("title", { country }), description: t("intro", { country }) });
}

/** The Sawwiq 50 (marketing/05): the people behind the most pages in the visitor's country, computed live. */
export default async function TopPage({ params }: PageProps<"/[locale]/sawwiq50">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Top");
  const code = await currentCountry();
  const country = countryName(code, locale);
  const rows = await topAgencies(code);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8" data-testid="top-page">
      <h1 className="text-2xl font-bold">{t("title", { country })}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("intro", { country })}</p>
      {rows.length ? (
        <ol className="mt-6 divide-y rounded-xl border" data-testid="top-list">
          {rows.map((r) => (
            <li key={r.agency.id} className="flex items-center gap-3 p-3" data-testid="top-row">
              <span className="w-8 text-center text-lg font-bold text-muted-foreground">{r.rank}</span>
              <AgencyAvatar name={r.agency.name} src={r.agency.avatarUrl} size={44} />
              <div className="min-w-0 flex-1">
                <Link href={`/a/${r.agency.handle}`} className="font-semibold hover:underline" dir="auto">{r.agency.name}</Link>
                <p className="text-xs text-muted-foreground">
                  {r.memberNo ? `${t("member")} #${String(r.memberNo).padStart(4, "0")} · ` : ""}
                  {t("confirmed")}: {r.confirmed} · {t("reviews")}: {r.reviews} · {t("posts")}: {r.posts}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed p-4 text-sm text-muted-foreground" data-testid="top-empty">{t("empty", { country })}</p>
      )}
      <p className="mt-6 text-sm text-muted-foreground">{t("how")}</p>
    </div>
  );
}
