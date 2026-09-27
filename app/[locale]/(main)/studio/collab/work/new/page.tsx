import { inArray, and, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { CollabHeader, CollabTabs } from "@/components/collab/collab-tabs";
import { InquiryForm, type Recipient } from "@/components/collab/inquiry-form";
import { collabOptions } from "@/components/collab/options";
import { currencyOf } from "@/lib/countries";
import { blockedSet } from "@/lib/data/collab-blocks";
import { partnerIdsOf } from "@/lib/data/collab-discovery";
import { listRoster } from "@/lib/data/collab-roster";
import { listAgencyContracts } from "@/lib/data/contracts";
import { getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { collabPage } from "../../gate";

/** Studio → Collaborate → New inquiry: to people from the roster, partners, or the one picked in Discover. */
export default async function NewInquiryPage({ params, searchParams }: PageProps<"/[locale]/studio/collab/work/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency, soon } = await collabPage();
  if (soon) return <ComingSoon feature="collaboration" />;
  const sp = await searchParams;
  const t = await getTranslations("Collab");
  const to = (typeof sp.to === "string" ? sp.to.split(",") : []).filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 8);
  const needId = typeof sp.need === "string" && /^[0-9a-f-]{36}$/.test(sp.need) ? sp.need : "";
  const [roster, partnerIds, blocked, opts, contracts] = await Promise.all([listRoster(agency.id), partnerIdsOf(agency.id), blockedSet(agency.id), collabOptions(locale, agency.country), listAgencyContracts(agency.id)]);
  const ids = [...new Set([...to, ...roster.map((r) => r.providerAgencyId), ...partnerIds])].filter((id) => id !== agency.id && !blocked.has(id));
  const db = await getDb();
  const rows = ids.length ? await db.select({ id: agencies.id, name: agencies.name, kind: agencies.kind, isDemo: agencies.isDemo }).from(agencies).where(and(inArray(agencies.id, ids), eq(agencies.status, "active"))) : [];
  const recipients: Recipient[] = rows.filter((r) => !r.isDemo || agency.isDemo).map((r) => ({ id: r.id, name: r.name, kind: r.kind, partner: partnerIds.has(r.id) })).sort((a, b) => Number(to.includes(b.id)) - Number(to.includes(a.id)) || a.name.localeCompare(b.name));
  // The buyer's own client contracts, linkable privately (never sent to the supplier).
  const parents = contracts.filter((c) => ["sent", "active"].includes(c.status) && !c.clientAgencyId).map((c) => ({ key: c.id, label: `${c.number} · ${c.title}` }));
  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="inquiry-new">
      <CollabTabs active="work" />
      <CollabHeader title={t("inquiry.title")} intro={t("inquiry.intro")} />
      <InquiryForm recipients={recipients} preselected={to} roles={opts.roles} platforms={opts.platforms} cities={opts.cities} currency={currencyOf(agency.country)} defaultCity={agency.city} needId={needId} parentContracts={parents} />
    </div>
  );
}
