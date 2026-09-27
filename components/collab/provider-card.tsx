import { BadgeCheck, CalendarCheck2, CalendarClock, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AgencyAvatar } from "@/components/agency-avatar";
import { Link } from "@/i18n/navigation";
import type { AvailabilityState } from "@/lib/collab/availability";
import { countryOf } from "@/lib/countries";
import { roleLabel } from "@/lib/services/catalog";
import { cn } from "@/lib/utils";

export type ProviderCardData = { id: string; handle: string; name: string; kind: "agency" | "freelancer"; city: string; country: string; avatarUrl: string | null; isVerified: boolean };

/** Availability as a reader may see it: never "ready" for unknown or stale. */
export async function AvailabilityBadge({ state }: { state: AvailabilityState }) {
  const t = await getTranslations("Collab.availability.state");
  const ready = state === "confirmed" || state === "limited";
  const Icon = ready ? CalendarCheck2 : CalendarClock;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", ready ? "bg-brand-soft text-brand" : state === "busy" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")} data-testid="availability-state" data-state={state}>
      <Icon className="size-3" aria-hidden /> {t(state)}
    </span>
  );
}

export async function ProviderCard({ card, locale, roles = [], reasons = [], availability, children }: { card: ProviderCardData; locale: string; roles?: string[]; reasons?: string[]; availability?: AvailabilityState; children?: React.ReactNode }) {
  const t = await getTranslations("Collab");
  const tCity = await getTranslations("Cities");
  return (
    <article className="grid gap-3 rounded-2xl border p-3 sm:grid-cols-[auto_1fr_auto] sm:items-start" data-testid="provider-card" data-handle={card.handle}>
      <AgencyAvatar name={card.name} src={card.avatarUrl} size={48} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 font-semibold">
          <Link href={`/a/${card.handle}`} className="break-words hover:underline">{card.name}</Link>
          {card.isVerified && <BadgeCheck className="size-4 text-brand" aria-label={t("verified")} />}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{t(`kinds.${card.kind}`)}</span>
          <span className="inline-flex items-center gap-0.5"><MapPin className="size-3" aria-hidden /> {countryOf(card.country).flag} {tCity(card.city)}</span>
          {availability && <AvailabilityBadge state={availability} />}
        </p>
        {roles.length > 0 && (
          <p className="mt-1.5 flex flex-wrap gap-1">
            {roles.map((r) => <span key={r} className="rounded-full border border-brand-line bg-brand-soft px-2 py-0.5 text-xs">{roleLabel(r, locale)}</span>)}
          </p>
        )}
        {reasons.length > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground" data-testid="match-reasons">
            {t("why")}: {reasons.map((r) => t(`reasons.${r}`)).join(locale === "ar" ? "، " : ", ")}
          </p>
        )}
      </div>
      {children && <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">{children}</div>}
    </article>
  );
}
