import { Check, Clock, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Package } from "@/lib/db/schema";
import { formatJod } from "@/lib/format";
import { deliverable, lineLabel } from "@/lib/deliverables";
import { serviceLabel } from "@/lib/labels";
import { localized } from "@/lib/content-lang";
import styles from "./profile-layout.module.css";

/** Presentation only. Package terms, prices, billing and translations are unchanged. */
export async function PackageList({ packages: rows, currency = "JOD", lang = "ar" }: { packages: Package[]; currency?: string; lang?: string }) {
  const t = await getTranslations("Packages");
  const locale = await getLocale();
  const td = await getTranslations("Deliverables");
  const tp = await getTranslations("Platforms");
  const packages = rows.map((p) => ({ ...p, ...localized({ title: p.title, description: p.description, deliverables: p.deliverables }, p.translation, lang, locale) }));
  return (
    <section>
      <h2 className={styles.sectionTitle}>{t("title")}</h2>
      <ul className={styles.packageGrid} data-testid="package-list">
        {packages.map((p) => (
          <li key={p.id} className={styles.packageCard}>
            <p className={styles.packageCategory}><bdi dir="auto">{serviceLabel(p.service, locale)}</bdi></p>
            <h3 className={styles.packageName}><bdi dir="auto">{p.title}</bdi></h3>
            <p className={styles.packagePrice}>
              <bdi>{formatJod(p.priceJod, locale, currency)}</bdi>
              <span>{p.billing === "monthly" ? t("perMonth") : t("oneOff")}</span>
            </p>
            {p.description && <p className={styles.packageDescription} dir="auto">{p.description}</p>}
            {p.items.length > 0 && (
              <ul className={styles.packageItems} data-testid="package-items">
                {p.items.map((line, i) => (
                  <li key={i}>
                    <Check className="mt-1 size-4 text-brand" aria-hidden />
                    <span>
                      {lineLabel(line, (k, v) => td(k as "add", v as never), (pl) => tp(pl as "instagram"))}
                      {deliverable(line.key)?.offline && <MapPin className="ms-1 inline size-3 text-muted-foreground" aria-label={td("offline")} />}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {p.deliverables.length > 0 && (
              <ul className={styles.packageItems}>
                {p.deliverables.map((d) => (
                  <li key={d}><Check className="mt-1 size-4 text-brand" aria-hidden /><span dir="auto">{d}</span></li>
                ))}
              </ul>
            )}
            {p.deliveryDays ? <p className={styles.delivery}><Clock className="size-4 shrink-0" aria-hidden />{t("deliveryIn", { days: p.deliveryDays })}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
