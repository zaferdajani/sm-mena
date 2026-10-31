import { CheckCircle2, ChevronLeft, Circle, ShieldAlert } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { aiStatus } from "@/lib/ai/agent";
import { requireAdmin } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { mfaKeyConfigured } from "@/lib/auth/mfa";
import { googleConfigured } from "@/lib/google";
import { paymentProvider } from "@/lib/payments/provider";
import { monetizationReadiness, platformStats } from "@/lib/data/admin";
import { adminAttention } from "@/lib/data/admin-attention";
import { monetizationEnabled } from "@/lib/monetization/plans";

export default async function AdminDashboard({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireAdmin();
  const t = await getTranslations("Admin");
  const tt = await getTranslations("AdminTeam");
  const showStats = can(me.role, "stats.view");
  const showSystem = can(me.role, "system.view");
  const [s, attention] = await Promise.all([platformStats(), adminAttention()]);
  // What waits for the team, each row one tap from the page that handles it (only sections this role may open).
  const waiting = ([
    ["supportReports", attention.supportReports, "/admin/bugs", "support.manage"],
    ["disputes", attention.disputes, "/admin/payments?tab=protected", "payments.view"],
    ["postReports", attention.postReports, "/admin/reports", "content.moderate"],
    ["services", attention.services, "/admin/services", "agencies.moderate"],
    ["siteErrors", attention.siteErrors, "/admin/bugs?tab=errors", "bugs.manage"],
  ] as const).filter(([, n, , perm]) => n > 0 && can(me.role, perm));
  const n = (v: number) => v.toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en");
  const tiles: [string, number][] = [
    ["agencies", s.agencies.active], ["verified", s.agencies.verified], ["paid", s.agencies.paid],
    ["posts", s.posts.total], ["postsRecent", s.posts.recent], ["visitors", s.visitors30d], ["views", s.views30d],
    ["contacts", s.contacts30d], ["inquiries", s.inquiries30d], ["contactsPerAgency", s.contactsPerAgency], ["openReports", s.openReports],
  ];
  // Plain words for the owner; the technical value (engine, model, provider) stays one tap away.
  const ai = aiStatus();
  const health: [string, string, string][] = [
    ["database", process.env.DATABASE_URL ? t("health.ready") : t("health.localCopy"), process.env.DATABASE_URL ? "Postgres" : "PGlite"],
    ["storage", process.env.STORAGE_PROVIDER === "supabase" ? t("health.ready") : t("health.localFiles"), process.env.STORAGE_PROVIDER === "supabase" ? "Supabase" : "local"],
    ["ai", ai === "basic" ? t("health.aiBasic") : t("health.aiOn"), ai],
    ["google", googleConfigured() ? t("health.on") : t("health.off"), ""],
    ["payments", paymentProvider().id === "mock" ? t("health.paymentsTest") : t("health.on"), paymentProvider().id],
    ["mfa", mfaKeyConfigured() ? t("health.on") : t("health.off"), ""],
  ];
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground" data-testid="role-summary">
        {tt(`roles.${me.role as "owner"}.body`)}
      </p>
      {(!mfaKeyConfigured() || !me.mfaEnabled) && (
        <p className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-sm" role="alert">
          <ShieldAlert className="size-4 text-amber-600" />
          {!mfaKeyConfigured() ? t("health.mfaMissingKey") : t("health.mfaYouOff")}
          {mfaKeyConfigured() && (
            <Link href="/admin/security" className="font-medium text-brand hover:underline">
              {t("health.turnOn")}
            </Link>
          )}
        </p>
      )}
      <section className="rounded-xl border p-4" data-testid="admin-attention">
        <h2 className="font-semibold">{t("attention.title")}</h2>
        {waiting.length ? (
          <ul className="mt-2 divide-y">
            {waiting.map(([key, count, href]) => (
              <li key={key}>
                <Link href={href} className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm hover:text-brand" data-testid={`attention-${key}`}>
                  <span>{t(`attention.${key}`, { count })}</span>
                  <ChevronLeft className="size-4 shrink-0 ltr:rotate-180" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{t("attention.none")}</p>
        )}
      </section>
      {showStats && <p className="text-xs text-muted-foreground" data-testid="real-data-note">{t("realOnly")}</p>}
      {showStats && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="admin-stats">
          {tiles.map(([key, value]) => (
            <div key={key} className="flex flex-col-reverse rounded-xl border p-3">
              <dt className="text-xs text-muted-foreground">{t(`stats.${key}`)}</dt>
              <dd className="text-2xl font-bold tabular-nums">{n(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {showStats && (
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
      )}
      {showSystem && (
        <section className="rounded-xl border p-4">
          <h2 className="font-semibold">{t("health.title")}</h2>
          <dl className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-1 text-sm sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            {health.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b py-1 last:border-0">
                <dt className="text-muted-foreground">{t(`health.${k}` as "health.ai")}</dt>
                <dd className="min-w-0 truncate font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <details className="mt-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer">{t("health.technical")}</summary>
            <p className="break-all" dir="ltr">{health.filter(([, , raw]) => raw).map(([k, , raw]) => `${k}: ${raw}`).join(" · ")}</p>
          </details>
        </section>
      )}
    </div>
  );
}
