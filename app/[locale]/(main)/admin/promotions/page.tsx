import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { PromotionButtons } from "@/components/admin/admin-buttons";
import { PromotionForm } from "@/components/admin/promotion-form";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { listPromotions } from "@/lib/data/admin";
import { CITIES } from "@/lib/labels";
import { PROMOTION_RULES } from "@/lib/monetization/plans";
import { allServices } from "@/lib/taxonomy";

export default async function AdminPromotions({ params }: PageProps<"/[locale]/admin/promotions">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("promotions.manage");
  const t = await getTranslations("Admin.promo");
  const tCity = await getTranslations("Cities");
  const lang = await getLocale();
  const rows = await listPromotions();
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return (
    <div className="space-y-6">
      <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">{t("free", { price: PROMOTION_RULES.pricePerDayJod })}</p>
      <PromotionForm
        services={allServices.map((s) => ({ key: s.key, label: lang === "ar" ? s.name_ar : s.name_en }))}
        cities={CITIES.map((key) => ({ key, label: tCity(key) }))}
        today={fmt(now)}
        inAWeek={fmt(new Date(now.getTime() + 7 * 24 * 3600 * 1000))}
      />
      {!rows.length ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-xl border" data-testid="admin-promotions">
          {rows.map(({ promotion: p, handle, name }) => {
            const status = p.status === "active" && p.endsAt < now ? "ended" : p.status;
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-semibold">
                    {name} <span className="font-normal text-muted-foreground" dir="ltr">@{handle}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`placements.${p.placement}`)} · {t(`status.${status}`)} · <span dir="ltr">{fmt(p.startsAt)} → {fmt(p.endsAt)}</span> · {p.impressions} {t("impressions")} · {p.clicks} {t("clicks")}
                    {p.postId && <> · <Link href={`/p/${p.postId}`} className="text-brand">post</Link></>}
                  </p>
                  {p.note && <p className="text-xs">{p.note}</p>}
                </div>
                <PromotionButtons id={p.id} status={status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
