import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReleaseStamp } from "@/components/release-stamp";
import { SetupWizard } from "@/components/setup/wizard";
import { requireAgency } from "@/lib/auth/guards";
import { getItemForAgency, listConnections, pendingResources, providerStates } from "@/lib/data/social";
import { getSetup, openSetup } from "@/lib/data/portfolio-setup";
import { listClients } from "@/lib/data/portfolio-clients";
import { postFormOptions } from "@/lib/studio-options";
import { canUse } from "@/lib/feature-gate";
import { mediaUrl } from "@/lib/storage";
import { FOOTER_SERVICES } from "@/components/shell/site-footer";

// First-run portfolio setup (docs/53): five short steps with real input, saved
// privately on the server and resumable. Nothing is public until the owner
// publishes on the last step. Outside the Studio layout on purpose: no
// unrelated tools while setting up; language, help and account stay reachable.
export default async function PortfolioSetupPage({ params, searchParams }: PageProps<"/[locale]/portfolio-setup">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user, agency } = await requireAgency();
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const view = (await getSetup(agency.id)) ?? (await openSetup(agency.id, user.id));
  const [clients, connections, imports] = await Promise.all([listClients(agency.id), listConnections(agency.id), canUse("portfolio_import")]);
  const grant = one(q.grant);
  const pending = /^[0-9a-f-]{36}$/.test(grant) ? await pendingResources(agency.id, grant) : [];
  const staged = view.data.socialItemId ? await getItemForAgency(agency.id, view.data.socialItemId) : null;
  const options = await postFormOptions(agency.services, agency.id);
  const t = await getTranslations("Setup");
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-5">
      <h1 className="sr-only">{t("pageTitle")}</h1>
      <SetupWizard
        initial={view}
        agency={{
          name: agency.name,
          bio: agency.bio,
          handle: agency.handle,
          city: agency.city,
          avatarUrl: mediaUrl(agency.avatarKey),
          services: agency.services,
          contentLang: agency.contentLang === "en" ? "en" : "ar",
        }}
        serviceOptions={options.services}
        popularServices={[...FOOTER_SERVICES]}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        importsOn={imports}
        providers={providerStates()}
        connections={connections}
        grant={pending.length ? { id: grant, resources: pending } : null}
        socialNotice={one(q.social).slice(0, 30) || null}
        invited={one(q.invited) === "1"}
        stagedItem={staged ? { title: staged.item.title, thumbnailUrl: staged.item.thumbnailUrl, provider: staged.item.provider, permalink: staged.item.permalink, ownership: staged.resource.ownership } : null}
      />
      <div className="mt-8 border-t pt-3"><ReleaseStamp /></div>
    </div>
  );
}
