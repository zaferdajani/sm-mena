import { getLocale, getTranslations } from "next-intl/server";
import { PioneerSeal } from "@/components/pioneer/pioneer-seal";
import { Link } from "@/i18n/navigation";
import { awardMedalIfComplete } from "@/lib/data/pioneers";
import { PIONEER, localizeDigits, sealNumber, type MedalItem } from "@/lib/pioneers";

/** Where each missing item is filled in. */
const FIX: Record<MedalItem, string> = {
  logo: "/studio/profile",
  bio: "/studio/profile",
  services: "/studio/profile",
  platforms: "/studio/profile",
  price: "/studio/packages",
  contact: "/studio/profile",
  project: "/studio/new",
};

/**
 * The Founding Member medal in the Studio (docs/57), for pages that registered from a letter.
 * Rendering it also gives the medal the moment the page is complete, so the number follows
 * the order in which pages are finished.
 */
export async function MedalPanel({ agencyId }: { agencyId: string }) {
  const status = await awardMedalIfComplete(agencyId).catch(() => ({ state: "none" as const }));
  if (status.state === "none") return null;
  const t = await getTranslations("Pioneer.studio");
  const locale = await getLocale();
  if (status.state === "awarded") {
    return (
      <section className="mb-4 flex items-center gap-3 rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="medal-panel" data-state="awarded">
        <PioneerSeal number="" size={48} />
        <p className="font-semibold">{t("awarded", { number: sealNumber(status.number, locale) })}</p>
      </section>
    );
  }
  const done = status.checklist.filter((c) => c.done).length;
  return (
    <section className="mb-4 space-y-3 rounded-xl border border-brand-line bg-brand-soft p-4 text-sm" data-testid="medal-panel" data-state={status.state}>
      <div className="flex items-center gap-3">
        <PioneerSeal number="" size={48} />
        <div className="min-w-0">
          <h2 className="font-semibold">{status.state === "late" ? t("lateTitle") : t("title")}</h2>
          <p className="text-muted-foreground">
            {status.state === "late"
              ? t("lateBody")
              : t("body", { left: localizeDigits(status.left, locale), cap: localizeDigits(PIONEER.cap, locale), done: localizeDigits(done, locale), total: localizeDigits(status.checklist.length, locale) })}
          </p>
        </div>
      </div>
      {status.state === "pending" && (
        <ul className="grid gap-1.5 sm:grid-cols-2" data-testid="medal-checklist">
          {status.checklist.map(({ item, done: ok }) => (
            <li key={item} className="flex items-center gap-2" data-item={item} data-done={ok}>
              <span aria-hidden className={ok ? "text-brand" : "text-muted-foreground"}>{ok ? "✓" : "○"}</span>
              {ok ? <span className="text-muted-foreground line-through">{t(`items.${item}`)}</span> : <Link href={FIX[item]} className="font-medium text-brand underline underline-offset-4">{t(`items.${item}`)}</Link>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
