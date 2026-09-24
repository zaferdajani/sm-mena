import { getTranslations, setRequestLocale } from "next-intl/server";
import { BackgroundForm } from "@/components/theme/background-form";
import { SubmitButton } from "@/components/submit-button";
import { requireStaff } from "@/lib/auth/guards";
import { COUNTRIES, countryName, countryOf } from "@/lib/countries";
import { storage } from "@/lib/storage";
import { dayIn, listBackgrounds, pickBackground } from "@/lib/theme/backgrounds";
import { removeBackgroundAction, toggleBackgroundAction } from "./actions";

export default async function AdminAppearance({ params }: PageProps<"/[locale]/admin/appearance">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("appearance.manage");
  const t = await getTranslations("Appearance");
  const list = await listBackgrounds();
  const scopeName = (s: string) => (s === "all" ? t("allCountries") : `${countryOf(s).flag} ${countryName(s, locale)}`);
  // What each country's interface shows today.
  const live = COUNTRIES.map((c) => ({ code: c.code, bg: pickBackground(list, c.code, dayIn(c.timeZones[0])) }));
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <BackgroundForm scopes={[{ value: "all", label: t("allCountries") }, ...COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag} ${countryName(c.code, locale)}` }))]} />

      <section className="space-y-2">
        <h2 className="font-semibold">{t("today")}</h2>
        <ul className="grid gap-1 text-sm sm:grid-cols-2" data-testid="background-today">
          {live.map(({ code, bg }) => (
            <li key={code} className="flex justify-between gap-2 rounded-lg border px-3 py-1.5">
              <span>{scopeName(code)}</span>
              <span className="truncate text-muted-foreground" dir="auto">{bg ? bg.label : t("none")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{t("list")}</h2>
        {!list.length && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
        <ul className="space-y-2" data-testid="background-list">
          {list.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl border p-3">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                {b.kind === "video" ? (
                  <video src={storage().url(b.mediaKey)} muted playsInline preload="metadata" className="size-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- thumbnail of a stored background
                  <img src={storage().url(b.mediaKey)} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium" dir="auto">{b.label}</p>
                <p className="text-xs text-muted-foreground">
                  {scopeName(b.scope)} · {t(`kinds.${b.kind}`)} · {b.startsOn || b.endsOn ? t("between", { from: b.startsOn ?? "…", to: b.endsOn ?? "…" }) : t("always")} · {t("veilShort", { n: b.veil })}
                </p>
              </div>
              <form action={toggleBackgroundAction}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="enabled" value={b.enabled ? "0" : "1"} />
                <SubmitButton variant="outline">{b.enabled ? t("turnOff") : t("turnOn")}</SubmitButton>
              </form>
              <form action={removeBackgroundAction}>
                <input type="hidden" name="id" value={b.id} />
                <SubmitButton variant="ghost">{t("remove")}</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
