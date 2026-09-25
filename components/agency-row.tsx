import { getLocale, getTranslations } from "next-intl/server";
import { COUNTRIES, currencyOf } from "@/lib/countries";
import { AgencyAvatar } from "@/components/agency-avatar";
import { RatingBadge } from "@/components/reviews/stars";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import type { AgencySummary } from "@/lib/data/agencies";
import { formatJod } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { servesNote } from "@/lib/serves-note";
import { agencyName } from "@/lib/content-lang";

/** `viewCountry`: the country being browsed; an agency based elsewhere gets a "based in … · serves …" note. */
export async function AgencyRow({ agency, viewCountry }: { agency: AgencySummary; viewCountry?: string }) {
  const locale = await getLocale();
  const tc = await getTranslations("Common");
  const tCity = await getTranslations("Cities");
  const tp = await getTranslations("Profile");
  const note = viewCountry ? await servesNote(agency, viewCountry) : null;
  return (
    <Link href={`/a/${agency.handle}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted" data-testid="agency-row">
      <AgencyAvatar name={agencyName(agency, locale)} src={agency.avatarUrl} size={52} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 font-semibold">
          <span className="truncate">{agencyName(agency, locale)}</span>
          {agency.isVerified && <VerifiedBadge label={tc("verified")} />}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          <span dir="ltr">@{agency.handle}</span> · {COUNTRIES.find((c) => c.code === agency.country)?.flag} {tCity(agency.city)} · {agency.postCount} {tp("posts")}
        </p>
        {note && <p className="truncate text-xs font-medium text-brand" data-testid="serves-note">{note}</p>}
        {agency.ratingAverage !== null && <RatingBadge average={agency.ratingAverage} count={agency.ratingCount} />}
        <p className="truncate text-xs text-muted-foreground">
          {agency.services.slice(0, 3).map((s) => serviceLabel(s, locale)).join(" · ")}
          {agency.startingPriceJod ? ` · ${tc("from", { price: formatJod(agency.startingPriceJod, locale, currencyOf(agency.country)) })}` : ""}
        </p>
      </div>
    </Link>
  );
}
