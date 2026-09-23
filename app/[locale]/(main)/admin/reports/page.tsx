import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportButtons } from "@/components/admin/admin-buttons";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { listOpenReports } from "@/lib/data/admin";
import { timeAgo } from "@/lib/format";

export default async function AdminReports({ params }: PageProps<"/[locale]/admin/reports">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("Admin");
  const tr = await getTranslations("Report");
  const rows = await listOpenReports();
  if (!rows.length) return <p className="py-10 text-center text-sm text-muted-foreground">{t("noReports")}</p>;
  return (
    <ul className="space-y-3" data-testid="admin-reports">
      {rows.map(({ report, post, agency, coverUrl }) => (
        <li key={report.id} className="flex gap-3 rounded-xl border p-3">
          {coverUrl && post && (
            <Link href={`/p/${post.id}`} className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image src={coverUrl} alt="" fill unoptimized sizes="80px" className="object-cover" />
            </Link>
          )}
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="font-semibold">{tr(`reasons.${report.reason}`)}</p>
            {report.details && <p className="text-muted-foreground">{report.details}</p>}
            <p className="text-xs text-muted-foreground">
              {agency && <span dir="ltr">@{agency.handle}</span>} · {timeAgo(report.createdAt.toISOString(), locale)}
            </p>
            <ReportButtons id={report.id} postId={post?.id ?? null} hidden={post?.status === "hidden"} />
          </div>
        </li>
      ))}
    </ul>
  );
}
