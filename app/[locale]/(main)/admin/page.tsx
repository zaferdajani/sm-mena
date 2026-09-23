import { CheckCircle2, Circle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import { monetizationReadiness, platformStats } from "@/lib/data/admin";
import { monetizationEnabled } from "@/lib/monetization/plans";

export default async function AdminDashboard({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("Admin");
  const s = await platformStats();
  const n = (v: number) => v.toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en");
  const tiles: [string, number][] = [
    ["agencies", s.agencies.active], ["verified", s.agencies.verified], ["demo", s.agencies.demo], ["paid", s.agencies.paid],
    ["posts", s.posts.total], ["postsRecent", s.posts.recent], ["visitors", s.visitors30d], ["views", s.views30d],
    ["contacts", s.contacts30d], ["inquiries", s.inquiries30d], ["contactsPerAgency", s.contactsPerAgency], ["openReports", s.openReports],
  ];
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="admin-stats">
        {tiles.map(([key, value]) => (
          <div key={key} className="flex flex-col-reverse rounded-xl border p-3">
            <dt className="text-xs text-muted-foreground">{t(`stats.${key}`)}</dt>
            <dd className="text-2xl font-bold tabular-nums">{n(value)}</dd>
          </div>
        ))}
      </dl>
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">{t("readiness.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("readiness.body")}</p>
        <ul className="mt-3 space-y-2">
          {monetizationReadiness(s).map((c) => (
            <li key={c.key} className="flex items-center gap-2 text-sm">
              {c.met ? <CheckCircle2 className="size-4 text-brand" /> : <Circle className="size-4 text-muted-foreground" />}
              <span className="flex-1">{t(`readiness.${c.key}`)}</span>
              <span className="tabular-nums">{n(c.value)} / {n(c.target)}</span>
              <span className="w-20 text-end text-xs text-muted-foreground">{c.met ? t("readiness.met") : t("readiness.notMet")}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-medium">{t("readiness.flag", { state: monetizationEnabled() ? t("readiness.on") : t("readiness.off") })}</p>
      </section>
    </div>
  );
}
