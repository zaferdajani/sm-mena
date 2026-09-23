import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AgencyAvatar } from "@/components/agency-avatar";
import { Link } from "@/i18n/navigation";
import type { AgencySummary } from "@/lib/data/agencies";

/** Stories-style row of round agency avatars. */
export async function AgenciesStrip({ agencies, showJoin }: { agencies: (AgencySummary & { sponsored?: boolean })[]; showJoin: boolean }) {
  const t = await getTranslations("Home");
  const tc = await getTranslations("Common");
  return (
    <nav aria-label={t("agenciesStrip")} className="border-b sm:rounded-xl sm:border">
      <ul className="flex gap-3 overflow-x-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {showJoin && (
          <li className="shrink-0">
            <Link href="/join" className="flex w-[72px] flex-col items-center gap-1">
              <span className="flex size-[66px] items-center justify-center rounded-full border-2 border-dashed border-brand text-brand">
                <Plus className="size-6" />
              </span>
              <span className="w-full truncate text-center text-xs">{t("joinStrip")}</span>
            </Link>
          </li>
        )}
        {agencies.map((agency) => (
          <li key={agency.id} className="shrink-0">
            <Link href={`/a/${agency.handle}`} className="flex w-[72px] flex-col items-center gap-1">
              <AgencyAvatar name={agency.name} src={agency.avatarUrl} size={60} ring />
              <span className="w-full truncate text-center text-xs" dir="auto">
                {agency.sponsored ? tc("sponsored") : agency.handle}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
