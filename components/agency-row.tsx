import { getLocale, getTranslations } from "next-intl/server";
import { AgencyAvatar } from "@/components/agency-avatar";
import { RatingBadge } from "@/components/reviews/stars";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import type { AgencySummary } from "@/lib/data/agencies";
import { formatJod } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";

export async function AgencyRow({ agency }: { agency: AgencySummary }) {
  const locale = await getLocale();
  const tc = await getTranslations("Common");
  const tCity = await getTranslations("Cities");
  const tp = await getTranslations("Profile");
  return (
    <Link href={`/a/${agency.handle}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted" data-testid="agency-row">
      <AgencyAvatar name={agency.name} src={agency.avatarUrl} size={52} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 font-semibold">
          <span className="truncate">{agency.name}</span>
          {agency.isVerified && <VerifiedBadge label={tc("verified")} />}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          <span dir="ltr">@{agency.handle}</span> · {tCity(agency.city)} · {agency.postCount} {tp("posts")}
        </p>
        {agency.ratingAverage !== null && <RatingBadge average={agency.ratingAverage} count={agency.ratingCount} />}
        <p className="truncate text-xs text-muted-foreground">
          {agency.services.slice(0, 3).map((s) => serviceLabel(s, locale)).join(" · ")}
          {agency.startingPriceJod ? ` · ${tc("from", { price: formatJod(agency.startingPriceJod, locale) })}` : ""}
        </p>
      </div>
    </Link>
  );
}
