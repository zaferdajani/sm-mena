import { getTranslations, setRequestLocale } from "next-intl/server";
import { ItemBrowserList, ProviderList, ResourceChooserPanel } from "@/components/social/connections-page";
import { requireAgency } from "@/lib/auth/guards";
import { listConnections, pendingResources, providerStates } from "@/lib/data/social";
import { listClients } from "@/lib/data/portfolio-clients";

// Studio → Connected platforms (docs/53): what each platform connection can do,
// its honest state, the chosen channels/Pages/accounts, and Disconnect.
export default async function ConnectionsPage({ params, searchParams }: PageProps<"/[locale]/studio/connections">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const q = await searchParams;
  const grant = typeof q.grant === "string" && /^[0-9a-f-]{36}$/.test(q.grant) ? q.grant : null;
  const notice = typeof q.social === "string" ? q.social.slice(0, 30) : null;
  const [connections, clients, pending] = await Promise.all([listConnections(agency.id), listClients(agency.id), grant ? pendingResources(agency.id, grant) : Promise.resolve([])]);
  const t = await getTranslations("Social");
  return (
    <div className="mx-auto max-w-2xl space-y-5" data-testid="connections-page">
      <header className="space-y-1">
        <h1 className="text-lg font-bold">{t("pageTitle")}</h1>
        <p className="text-sm leading-7 text-muted-foreground">{t("pageIntro")}</p>
      </header>
      {notice && notice !== "choose" && notice !== "limited" && <p role="status" className="rounded-xl border p-3 text-sm">{t(`error.${notice}` as never)}</p>}
      {grant && pending.length > 0 && <ResourceChooserPanel grantId={grant} resources={pending} />}
      <ItemBrowserList resources={connections.flatMap((c) => c.resources)} />
      <ProviderList providers={providerStates()} connections={connections} clients={clients.map((c) => ({ id: c.id, name: c.name }))} returnTo="connections" />
    </div>
  );
}
