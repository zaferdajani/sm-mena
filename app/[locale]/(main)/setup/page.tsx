import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandLockup } from "@/components/brand-lockup";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ClientStep, DoneActions, FinishForm, ProfileStep, ProjectStep, SourceStep, StepNav, type WizardDraft } from "@/components/setup/wizard";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { canUse } from "@/lib/feature-gate";
import { ensureDraft } from "@/lib/data/onboarding";
import { getClient } from "@/lib/data/portfolio-clients";
import { publicationFor } from "@/lib/data/publication";
import { isRegistrationPhase } from "@/lib/launch-phase";
import { mediaUrl } from "@/lib/storage";
import { postFormOptions } from "@/lib/studio-options";

export const metadata: Metadata = { robots: { index: false } };

/**
 * First-run portfolio setup (docs/53): five short steps right after
 * registration, outside the full Studio navigation. Everything it saves goes
 * through the same data operations as the Studio; finishing creates one real
 * post and never changes the page's visibility.
 */
export default async function SetupPage({ params, searchParams }: PageProps<"/[locale]/setup">) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const [t, tn, th, draft, opts, imports, publication] = await Promise.all([getTranslations("Setup"), getTranslations("Nav"), getTranslations("Header"), ensureDraft(agency), postFormOptions(agency.services, agency.id), canUse("portfolio_import"), publicationFor(agency.id)]);
  const requested = Number.parseInt(String(sp.step ?? ""), 10);
  const done = sp.done === "1" && draft.status === "finished";
  const step = done ? 0 : Math.min(5, Math.max(1, Number.isFinite(requested) && requested > 0 ? requested : draft.step));
  const stale = sp.stale === "1";
  const view: WizardDraft = { version: draft.version, step: draft.step, status: draft.status, source: draft.source, clientMode: draft.clientMode, clientId: draft.clientId, suggestedClient: draft.suggestedClient, title: draft.title, contribution: draft.contribution, services: draft.services, platforms: draft.platforms, media: draft.media, cover: draft.cover };
  const client = draft.clientMode === "client" && draft.clientId ? await getClient(agency.id, draft.clientId) : null;
  const visibilityNote = isRegistrationPhase() ? t(`s5.visibility.${publication.legacy ? "legacyPublic" : publication.visibility}`) : t("s5.visibility.live");
  const finishedButNotDone = draft.status === "finished" && !done;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5" data-testid="setup-wizard" data-step={step}>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" aria-label={tn("home")}><BrandLockup label="Sawwiq" compact /></Link>
        <nav className="flex items-center gap-3 text-sm" aria-label={t("controls")}>
          <LocaleSwitcher label={th("switchLocale")} ariaLabel={th("switchLocaleLabel")} />
          <Link href="/support" className="text-brand">{tn("support")}</Link>
          <Link href="/studio" className="text-brand" data-testid="setup-exit">{t("exit")}</Link>
        </nav>
      </header>
      {sp.welcome === "1" && <p className="mb-4 rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="setup-welcome">{sp.invited === "1" ? t("welcomeInvited") : t("welcome")}</p>}
      {done ? (
        <section className="grid gap-4" data-testid="setup-done">
          <h1 className="flex items-center gap-2 text-xl font-bold"><CheckCircle2 className="size-6 text-brand" aria-hidden /> {t(isRegistrationPhase() && !publication.legacy && publication.visibility !== "public" ? "done.savedPrivate" : "done.saved")}</h1>
          <p className="text-sm text-muted-foreground">{visibilityNote}</p>
          <DoneActions handle={agency.handle} hasClient={Boolean(draft.clientId)} />
        </section>
      ) : finishedButNotDone ? (
        <section className="grid gap-4" data-testid="setup-finished">
          <h1 className="text-xl font-bold">{t("finished.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("finished.body")}</p>
          <DoneActions handle={agency.handle} hasClient={Boolean(draft.clientId)} />
        </section>
      ) : (
        <>
          <StepNav step={step} stale={stale} />
          <main className="mt-5">
            {step === 1 && <ProfileStep draft={view} agency={{ name: agency.name, bio: agency.bio, avatarUrl: mediaUrl(agency.avatarKey), services: agency.services }} services={opts.services} />}
            {step === 2 && <SourceStep draft={view} imports={imports} />}
            {step === 3 && <ClientStep draft={view} clients={opts.clients} />}
            {step === 4 && <ProjectStep draft={view} services={opts.services} platforms={opts.platforms} />}
            {step === 5 && (
              <div className="grid gap-5" data-testid="setup-preview">
                <h1 className="text-xl font-bold">{t("s5.title")}</h1>
                <div className="rounded-2xl border p-3">
                  <ProfileHeader previewOnly agency={{ ...agency, avatarUrl: mediaUrl(agency.avatarKey), memberNo: null, founding: false, ratingAverage: null }} following={false} />
                  <article className="mt-4 grid gap-2 border-t pt-4" data-testid="setup-preview-project">
                    {client && <p className="text-xs font-semibold text-muted-foreground" data-testid="setup-preview-client"><bdi>{client.name}</bdi></p>}
                    {draft.clientMode === "personal" && <p className="text-xs font-semibold text-muted-foreground">{t("s3.personal")}</p>}
                    <h2 className="font-semibold" dir="auto"><bdi>{draft.title}</bdi></h2>
                    {draft.contribution && <p className="text-sm" dir="auto"><bdi>{draft.contribution}</bdi></p>}
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {draft.media.map((m, i) => (
                        <li key={m.key} className="overflow-hidden rounded-lg border" style={{ backgroundColor: m.color }}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- private, access-checked draft media */}
                          <img src={`/api/portfolio-media/${m.thumbKey}`} alt={i === 0 ? t("s4.cover") : ""} className="aspect-square w-full object-cover" />
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>
                <FinishForm draft={view} visibilityNote={visibilityNote} />
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}
