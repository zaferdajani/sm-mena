import { SearchX, Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { AgencyRow } from "@/components/agency-row";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { describeDifferences } from "@/lib/matching/describe";
import { DiffList, MatchMeter } from "./match-bits";
import type { CloseMatch } from "@/lib/matching/closest";

/**
 * Shown when a search finds nothing (docs/35-closest-matches.md): says so
 * plainly, then the closest agencies with their match percentage and what
 * differs from the request.
 */
export async function ClosestMatches({
  matches,
  currency,
  viewCountry,
  variant = "explore",
  sendHref,
}: {
  matches: CloseMatch[];
  currency: string;
  viewCountry: string;
  variant?: "explore" | "hire";
  /** The quote request form, when quote requests are open (Admin → Features). */
  sendHref?: { pathname: "/request/new"; query: Record<string, string> } | null;
}) {
  const t = await getTranslations("Closest");
  const locale = await getLocale();
  return (
    <section className="space-y-3 px-2 py-4" data-testid="closest">
      <div className="flex items-start gap-3 rounded-xl border border-dashed p-4" role="status">
        <SearchX className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold">{t("title")}</p>
          <p className="text-sm text-muted-foreground">{matches.length ? t(variant === "hire" ? "hireBody" : "body") : t("none")}</p>
        </div>
      </div>
      {matches.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {matches.map((m) => (
            <li key={m.id} className="min-w-0 space-y-2 rounded-xl border p-2 pb-3" data-testid="closest-agency">
              <AgencyRow agency={m} viewCountry={viewCountry} />
              <div className="space-y-2 px-2">
                <MatchMeter percent={m.percent} label={t("match", { percent: m.percent })} />
                <DiffList lines={describeDifferences(m.differences, locale, currency)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {sendHref && (
        <Link href={sendHref} className={buttonVariants({ variant: "outline", className: "h-9 gap-2" })}>
          <Sparkles className="size-4" />
          {t("send")}
        </Link>
      )}
    </section>
  );
}
