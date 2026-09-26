import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { DemoNotice } from "@/components/demo/demo-banner";
import { FeedList } from "@/components/feed/feed-list";
import { AccountLinks } from "@/components/profile/client-showcase";
import { Link } from "@/i18n/navigation";
import { localized, localizedAgency } from "@/lib/content-lang";
import { COUNTRIES } from "@/lib/countries";
import { getAgencyByHandle } from "@/lib/data/agencies";
import { getClient } from "@/lib/data/portfolio-clients";
import { feedPage } from "@/lib/feed";
import { pageMeta } from "@/lib/seo";
import { getVisitorId, interactionKey } from "@/lib/visitor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(handle: string, clientId: string, locale: string) {
  if (!UUID.test(clientId)) return null;
  const found = await getAgencyByHandle(handle);
  if (!found) return null;
  const client = await getClient(found.id, clientId);
  if (!client) return null;
  const agency = localizedAgency(found, locale);
  return { agency, client, ...localized({ name: client.name, description: client.description }, client.translation, agency.contentLang, locale) };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/a/[handle]/c/[client]">): Promise<Metadata> {
  const { locale, handle, client } = await params;
  const data = await load(handle, client, locale);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "Profile" });
  return pageMeta({
    locale,
    path: `/a/${data.agency.handle}/c/${data.client.id}`,
    title: `${data.name} · ${data.agency.name}`,
    description: data.description || `${t("accountsTitle")}: ${data.name} · ${data.agency.name}`,
    images: data.client.logoUrl ? [{ url: data.client.logoUrl, alt: data.name }] : undefined,
    noindex: data.agency.isDemo || data.agency.status !== "active",
    country: data.agency.country,
  });
}

/** An account the agency handles (docs/28): the client, the real accounts it runs for it, and every post filed under it. */
export default async function AccountPage({ params }: PageProps<"/[locale]/a/[handle]/c/[client]">) {
  const { locale, handle, client: clientId } = await params;
  setRequestLocale(locale);
  const data = await load(handle, clientId, locale);
  if (!data) notFound();
  const { agency, client, name, description } = data;
  const [t, tInd, visitorId] = await Promise.all([getTranslations("Profile"), getTranslations("Industries"), getVisitorId()]);
  const posts = await feedPage({ agencyId: agency.id, clientId: client.id }, null, visitorId, { limit: 24, stateKey: await interactionKey() });
  const country = COUNTRIES.find((x) => x.code === client.country);
  const meta = [client.industry ? tInd(client.industry) : null, country ? `${country.flag} ${locale === "ar" ? country.ar : country.en}` : null].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto w-full max-w-4xl" data-testid="account-page">
      {agency.isDemo && (
        <div className="px-4 pt-4">
          <DemoNotice kind="agency" />
        </div>
      )}
      <div className="px-4 pt-4">
        <Link href={`/a/${agency.handle}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand" data-testid="account-back">
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {t("backToAgency", { name: agency.name })}
        </Link>
      </div>
      <header className="flex items-start gap-4 px-4 py-4">
        {client.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logoUrl} alt="" className="size-20 shrink-0 rounded-full border bg-white object-cover" data-testid="account-logo" />
        ) : (
          <span className="grid size-20 shrink-0 place-items-center rounded-full border bg-muted text-2xl font-bold text-muted-foreground">{name.slice(0, 1)}</span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold" dir="auto">{name}</h1>
          <p className="text-sm text-muted-foreground">{[meta, t("accountPosts", { count: client.postCount })].filter(Boolean).join(" · ")}</p>
          {client.confirmedAt && <p className="mt-1 text-xs font-medium text-brand" data-testid="account-confirmed">✓ {t("confirmedByClient")}</p>}
          {description && <p className="mt-2 whitespace-pre-line text-sm" dir="auto">{description}</p>}
          {client.links.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("accountsManaged")}</p>
              <AccountLinks links={client.links} />
            </div>
          )}
        </div>
      </header>
      <div className="border-t" />
      {posts.items.length ? (
        <FeedList initial={posts} filters={{ agencyId: agency.id, clientId: client.id }} placement={null} layout="grid" />
      ) : (
        <p className="px-4 py-16 text-center text-muted-foreground">{t("accountEmpty")}</p>
      )}
    </div>
  );
}
