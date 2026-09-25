import { FileSignature, Handshake, Mail, MessageCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgencyAvatar } from "@/components/agency-avatar";
import { PartnerContractRequest } from "@/components/contracts/partner-contract-request";
import { PartnerAnswerButtons, PartnerRequestButton } from "@/components/studio/partner-widgets";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { countryOf, currencyOf } from "@/lib/countries";
import { listPartnerRequests, suggestPartners } from "@/lib/data/partners";
import { roleLabel, ROLES } from "@/lib/services/catalog";
import { whatsappLink } from "@/lib/text";
import { cn } from "@/lib/utils";

/**
 * Studio → Partners (docs/30): the roles the team lacks, freelancers and
 * agencies that cover them, and partnership requests sent and received.
 */
export default async function StudioPartnersPage({ params, searchParams }: PageProps<"/[locale]/studio/partners">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Partners");
  const tc = await getTranslations("PartnerContracts");
  const tCity = await getTranslations("Cities");
  const role = (await searchParams).role;
  const wanted = typeof role === "string" && ROLES.some((r) => r.key === role) ? [role] : agency.seeksRoles;
  const [requests, suggestions] = await Promise.all([listPartnerRequests(agency.id), suggestPartners(agency, wanted)]);
  const roleOptions = ROLES.map((r) => ({ key: r.key, label: locale === "ar" ? r.name_ar : r.name_en }));
  const incoming = requests.filter((r) => r.incoming && r.status === "pending");
  // One row per partner (the newest accepted request), and no suggestions for people you already work with or asked.
  const accepted = requests.filter((r, i, all) => r.status === "accepted" && all.findIndex((x) => x.status === "accepted" && x.other.id === r.other.id) === i);
  const outgoing = requests.filter((r) => !r.incoming && r.status === "pending");
  const known = new Set(requests.filter((r) => r.status === "accepted" || r.status === "pending").map((r) => r.other.id));
  const fresh = suggestions.filter((s) => !known.has(s.id));
  const chip = "rounded-full border px-2.5 py-1 text-xs";

  return (
    <div className="mx-auto grid max-w-2xl gap-6" data-testid="partners-page">
      <div className="rounded-xl border border-brand-line bg-brand-soft p-4">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Handshake className="size-5 text-brand" /> {t("title")}
        </h1>
        <p className="mt-1 text-sm">{agency.kind === "freelancer" ? t("introFreelancer") : t("intro")}</p>
        {agency.kind === "agency" && (
          <div className="mt-3 grid gap-2 text-sm">
            <p>
              <span className="text-muted-foreground">{t("have")}: </span>
              {agency.teamRoles.length ? agency.teamRoles.map((r) => roleLabel(r, locale)).join("، ") : t("notSet")}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground">{t("lookingFor")}:</span>
              {agency.seeksRoles.map((r) => (
                <Link key={r} href={{ pathname: "/studio/partners", query: { role: r } }} className={cn(chip, wanted.length === 1 && wanted[0] === r && "border-primary bg-primary text-primary-foreground")}>
                  {roleLabel(r, locale)}
                </Link>
              ))}
              {wanted.length === 1 && <Link href="/studio/partners" className="text-xs text-brand">{t("allRoles")}</Link>}
              <Link href="/studio/profile" className="text-xs text-brand">{t("editRoles")}</Link>
            </div>
          </div>
        )}
      </div>

      {incoming.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-semibold">{t("incoming")}</h2>
          {incoming.map((r) => (
            <div key={r.id} className="grid gap-2 rounded-xl border p-3" data-testid="partner-incoming">
              <p className="text-sm">
                <Link href={`/a/${r.other.handle}`} className="font-semibold">{r.other.name}</Link> · {t(`kinds.${r.other.kind}`)} · {tCity(r.other.city)}
              </p>
              {r.roles.length > 0 && <p className="text-xs text-muted-foreground">{t("forRoles")}: {r.roles.map((x) => roleLabel(x, locale)).join("، ")}</p>}
              {r.message && <p className="whitespace-pre-line text-sm" dir="auto">{r.message}</p>}
              <PartnerAnswerButtons requestId={r.id} incoming />
            </div>
          ))}
        </section>
      )}

      {accepted.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-semibold">{t("partners")}</h2>
          {accepted.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3" data-testid="partner-accepted">
              <AgencyAvatar name={r.other.name} src={r.other.avatarUrl} size={40} />
              <div className="min-w-0 flex-1">
                <Link href={`/a/${r.other.handle}`} className="font-semibold">{r.other.name}</Link>
                <p className="text-xs text-muted-foreground">{t(`kinds.${r.other.kind}`)} · {r.roles.map((x) => roleLabel(x, locale)).join("، ")}</p>
              </div>
              {r.other.whatsapp && (
                <a href={whatsappLink(r.other.whatsapp, t("waHello", { name: r.other.name }))} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg bg-[#25d366] px-3 py-1.5 text-sm font-medium text-white">
                  <MessageCircle className="size-4" /> {t("whatsapp")}
                </a>
              )}
              {r.other.email && (
                <a href={`mailto:${r.other.email}`} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm">
                  <Mail className="size-4" /> {t("email")}
                </a>
              )}
              {/* Partner contracts (docs/14): whoever does the work writes the contract. */}
              <Link href={`/studio/contracts/new?partner=${r.other.id}`} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm" data-testid="partner-create-contract">
                <FileSignature className="size-4" /> {tc("createFor")}
              </Link>
              <PartnerContractRequest toAgencyId={r.other.id} currency={currencyOf(agency.country)} />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{t("contractHint")}</p>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-semibold">{t("outgoing")}</h2>
          {outgoing.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm" data-testid="partner-outgoing">
              <span>
                <Link href={`/a/${r.other.handle}`} className="font-semibold">{r.other.name}</Link> · {t("waiting")}
              </span>
              <PartnerAnswerButtons requestId={r.id} incoming={false} />
            </div>
          ))}
        </section>
      )}

      {agency.kind === "agency" && (
        <section className="grid gap-2">
          <h2 className="font-semibold">{t("suggestions")}</h2>
          {wanted.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              {t("noSeeks")} <Link href="/studio/profile" className="text-brand">{t("editRoles")}</Link>
            </p>
          ) : fresh.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{t("noSuggestions")}</p>
          ) : (
            fresh.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3" data-testid="partner-suggestion">
                <AgencyAvatar name={s.name} src={s.avatarUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 font-semibold">
                    <Link href={`/a/${s.handle}`}>{s.name}</Link>
                    {s.isVerified && <VerifiedBadge label="✓" />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`kinds.${s.kind}`)} · {countryOf(s.country).flag} {tCity(s.city)}
                    {s.ratingAverage !== null ? ` · ★ ${s.ratingAverage}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.matched.map((m) => <span key={m} className={cn(chip, "border-brand-line bg-brand-soft")}>{roleLabel(m, locale)}</span>)}
                  </div>
                </div>
                <PartnerRequestButton toAgencyId={s.id} name={s.name} roles={roleOptions} matched={s.matched} />
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}
