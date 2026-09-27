import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { CollabHeader, CollabTabs, EmptyState } from "@/components/collab/collab-tabs";
import { collabOptions } from "@/components/collab/options";
import { NeedForm } from "@/components/collab/widgets";
import { AgencyAvatar } from "@/components/agency-avatar";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { openInquiryCount } from "@/lib/data/collab-inquiries";
import { listMyNeeds } from "@/lib/data/collab-needs";
import { formatDate } from "@/lib/format";
import { roleLabel } from "@/lib/services/catalog";
import { cn } from "@/lib/utils";
import { withdrawNeedAction } from "../actions";
import { collabPage } from "../gate";

/** Studio → Collaborate → My needs: what this agency chose to publish, and who raised a hand. */
export default async function CollabNeedsPage({ params }: PageProps<"/[locale]/studio/collab/needs">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency, soon } = await collabPage();
  if (soon) return <ComingSoon feature="collaboration" />;
  const t = await getTranslations("Collab");
  const tCity = await getTranslations("Cities");
  const [needs, opts, badge] = await Promise.all([listMyNeeds(agency.id), collabOptions(locale, agency.country), openInquiryCount(agency.id)]);
  const STATUS: Record<string, string> = { published: "bg-brand-soft text-brand", withdrawn: "bg-muted text-muted-foreground", expired: "bg-muted text-muted-foreground", filled: "bg-brand text-white" };
  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="collab-needs">
      <CollabTabs active="needs" badges={{ work: badge }} />
      <CollabHeader title={t("needs.title")} intro={t("needs.intro")} action={<NeedForm roles={opts.roles} services={opts.services} cities={opts.cities} defaultCity={agency.city} />} />
      {needs.length === 0 ? (
        <EmptyState title={t("needs.emptyTitle")} body={t("needs.emptyBody")} />
      ) : (
        needs.map((n) => (
          <article key={n.id} className="grid gap-3 rounded-2xl border p-4" data-testid="my-need" data-status={n.status}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-semibold break-words" dir="auto">{n.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {n.roles.map((r) => roleLabel(r, locale)).join(locale === "ar" ? "، " : ", ")} · {n.city ? tCity(n.city) : t("needs.anyCity")} · {t(`needs.audience${n.audience === "public" ? "Public" : "Partners"}`)}
                  {n.expiresAt && n.status === "published" ? ` · ${t("needs.until", { date: formatDate(n.expiresAt, locale) })}` : ""}
                </p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS[n.status])} data-testid="need-status">{t(`needs.status.${n.status}`)}</span>
            </div>
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold">{t("needs.replies", { count: n.replies.filter((r) => r.status === "interested").length })}</h3>
              {n.replies.filter((r) => r.status === "interested").map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3" data-testid="need-reply">
                  <AgencyAvatar name={r.provider.name} src={r.provider.avatarUrl} size={36} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/a/${r.provider.handle}`} className="font-medium hover:underline">{r.provider.name}</Link>
                    <p className="text-xs text-muted-foreground">{t(`kinds.${r.provider.kind}`)} · {tCity(r.provider.city)}</p>
                    {r.note && <p className="mt-1 text-sm whitespace-pre-line" dir="auto">{r.note}</p>}
                  </div>
                  <Link href={{ pathname: "/studio/collab/work/new", query: { to: r.provider.id, need: n.id } }} className={buttonVariants({ className: "h-11" })} data-testid="need-inquire">{t("inquiry.start")}</Link>
                </div>
              ))}
            </div>
            {n.status === "published" && (
              <div className="flex flex-wrap gap-2">
                <form action={withdrawNeedAction}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="filled" value="1" /><SubmitButton variant="outline" className="h-11">{t("needs.markFilled")}</SubmitButton></form>
                <form action={withdrawNeedAction}><input type="hidden" name="id" value={n.id} /><SubmitButton variant="ghost" className="h-11" testId="need-withdraw">{t("needs.withdraw")}</SubmitButton></form>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}
