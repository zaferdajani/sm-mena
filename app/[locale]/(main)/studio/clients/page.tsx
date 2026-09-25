import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientForm, ClientItem } from "@/components/studio/client-form";
import { requireAgency } from "@/lib/auth/guards";
import { COUNTRIES } from "@/lib/countries";
import { listClients, MAX_CLIENTS } from "@/lib/data/portfolio-clients";
import { INDUSTRIES } from "@/lib/labels";
import { contentLang } from "@/lib/content-lang";

/** Portfolio clients: the businesses the agency works for and the accounts it runs for each. */
export default async function StudioClientsPage({ params }: PageProps<"/[locale]/studio/clients">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("PortfolioClients");
  const tInd = await getTranslations("Industries");
  const industries = INDUSTRIES.map((key) => ({ key, label: tInd(key) }));
  const countries = COUNTRIES.map((c) => ({ key: c.code, label: `${c.flag} ${locale === "ar" ? c.ar : c.en}` }));
  const clients = await listClients(agency.id);
  const lang = contentLang(agency.contentLang);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      {clients.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{t("empty")}</p>}
      {clients.map((c) => (
        <ClientItem
          key={c.id}
          client={{ id: c.id, name: c.name, industry: c.industry, country: c.country, description: c.description, links: c.links, translation: c.translation }}
          industries={industries}
          countries={countries}
          industryLabel={c.industry ? tInd(c.industry) : null}
          postCount={c.postCount}
          contentLang={lang}
        />
      ))}
      {clients.length < MAX_CLIENTS ? (
        <section className="space-y-2">
          <h2 className="font-semibold">{t("add")}</h2>
          <ClientForm key={`new-${clients.length}`} industries={industries} countries={countries} defaultCountry={agency.country} contentLang={lang} />
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">{t("errors.limit")}</p>
      )}
    </div>
  );
}
