import { getTranslations, setRequestLocale } from "next-intl/server";
import { ServiceReview } from "@/components/admin/service-review";
import { requireStaff } from "@/lib/auth/guards";
import { ROLES, SERVICE_GROUPS } from "@/lib/services/catalog";
import { listPendingTags } from "@/lib/services/tags";
import { allServices } from "@/lib/taxonomy";

/** Services agencies typed that aren't tags yet: approve, merge or reject (docs/30). */
export default async function AdminServices({ params }: PageProps<"/[locale]/admin/services">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("agencies.moderate");
  const t = await getTranslations("AdminServices");
  const pending = await listPendingTags();
  const ar = locale === "ar";
  return (
    <div className="mx-auto grid max-w-2xl gap-4" data-testid="admin-services">
      <div>
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      {pending.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("none")}</p>}
      {pending.map((p) => (
        <ServiceReview
          key={p.id}
          tag={{ id: p.id, text: p.proposedText ?? p.nameEn, agencies: p.agencies }}
          groups={SERVICE_GROUPS.map((g) => ({ key: g.key, label: ar ? g.name_ar : g.name_en }))}
          parents={allServices.map((s) => ({ key: s.key, label: ar ? s.name_ar : s.name_en }))}
          roles={ROLES.map((r) => ({ key: r.key, label: ar ? r.name_ar : r.name_en }))}
        />
      ))}
    </div>
  );
}
