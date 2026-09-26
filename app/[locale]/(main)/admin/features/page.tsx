import { CheckCircle2, Circle, Construction, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeatureSwitch, GoLiveTick } from "@/components/admin/feature-switch";
import { requireStaff } from "@/lib/auth/guards";
import { FEATURES, getFeatures } from "@/lib/features";
import { formatDate } from "@/lib/format";
import { goLiveChecklist } from "@/lib/golive";

const GROUPS = ["money", "work", "discovery", "trust", "network"] as const;

/**
 * Admin → Features (the OneClickConvert console model): switch each platform
 * feature on, to "Coming soon" (with pilot agencies) or off, and follow the
 * go-live checklist for protected payments (docs/34-feature-switches.md).
 */
export default async function AdminFeatures({ params }: PageProps<"/[locale]/admin/features">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("features.manage");
  const t = await getTranslations("Features");
  const [features, golive] = await Promise.all([getFeatures(), goLiveChecklist()]);
  return (
    <div className="space-y-6" data-testid="admin-features">
      <header>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
          {(["on", "soon", "off"] as const).map((s) => (
            <li key={s}>
              <b className="text-foreground">{t(`states.${s}`)}</b> · {t(`stateHints.${s}`)}
            </li>
          ))}
        </ul>
      </header>

      {GROUPS.map((g) => (
        <section key={g} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{t(`groups.${g}`)}</h3>
          <ul className="divide-y rounded-xl border">
            {FEATURES.filter((f) => f.group === g).map((f) => (
              <li key={f.key} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    {t(`items.${f.key}.name`)}
                    {features[f.key].state === "soon" && <Construction className="size-4 text-amber-600" aria-label={t("states.soon")} />}
                  </p>
                  <p className="text-sm text-muted-foreground">{t(`items.${f.key}.desc`)}</p>
                </div>
                <FeatureSwitch featureKey={f.key} state={features[f.key].state} pilots={features[f.key].pilots} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="space-y-3 rounded-xl border-2 border-brand/40 p-4" data-testid="golive">
        <h3 className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-5 text-brand" /> {t("golive.title")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("golive.intro")}</p>
        <p className="text-sm font-medium" data-testid="golive-status">
          {golive.live ? t("golive.statusLive") : golive.ready ? t("golive.statusReady") : t("golive.statusNotReady")}
        </p>
        <ol className="space-y-2 text-sm">
          {golive.items.map((i, n) => (
            <li key={i.key} className="flex items-start gap-2">
              <span className="w-5 shrink-0 text-end text-xs tabular-nums text-muted-foreground">{n + 1}.</span>
              {i.manual ? (
                <div className="grid gap-0.5">
                  <GoLiveTick step={i.key} done={i.done} label={t(`golive.steps.${i.key as "partnerChosen"}`)} />
                  {i.at && <span className="text-xs text-muted-foreground">{t("golive.doneOn", { date: formatDate(new Date(i.at), locale) })}</span>}
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  {i.done ? <CheckCircle2 className="size-4 text-brand" /> : <Circle className="size-4 text-muted-foreground" />}
                  {t(`golive.steps.${i.key as "adapterConnected"}`)}
                  <span className="text-xs text-muted-foreground">({t("golive.auto")})</span>
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">{t("golive.docs")}</p>
      </section>
    </div>
  );
}
