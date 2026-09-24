import { Check, Clock, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Package } from "@/lib/db/schema";
import { formatJod } from "@/lib/format";
import { deliverable, lineLabel } from "@/lib/deliverables";
import { serviceLabel } from "@/lib/labels";

export async function PackageList({ packages }: { packages: Package[] }) {
  const t = await getTranslations("Packages");
  const locale = await getLocale();
  const td = await getTranslations("Deliverables");
  const tp = await getTranslations("Platforms");
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold">{t("title")}</h2>
      <ul className="grid gap-3 sm:grid-cols-2" data-testid="package-list">
        {packages.map((p) => (
          <li key={p.id} className="flex flex-col rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">{serviceLabel(p.service, locale)}</p>
            <h3 className="font-semibold">{p.title}</h3>
            <p className="mt-1 text-xl font-bold">
              {formatJod(p.priceJod, locale)}{" "}
              <span className="text-xs font-normal text-muted-foreground">{p.billing === "monthly" ? t("perMonth") : t("oneOff")}</span>
            </p>
            {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
            {p.items.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm" data-testid="package-items">
                {p.items.map((line, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-brand" />
                    <span>
                      {lineLabel(line, (k, v) => td(k as "add", v as never), (pl) => tp(pl as "instagram"))}
                      {deliverable(line.key)?.offline && <MapPin className="ms-1 inline size-3 text-muted-foreground" aria-label={td("offline")} />}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {p.deliveryDays && (
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> {t("deliveryIn", { days: p.deliveryDays })}
              </p>
            )}
            {p.deliverables.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {p.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-brand" />
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
