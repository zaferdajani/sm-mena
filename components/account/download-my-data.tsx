import { useTranslations } from "next-intl";

/** A plain link: the browser downloads the JSON from /api/account/export (PDPL / GDPR access and portability). */
export function DownloadMyData() {
  const t = useTranslations("DownloadMyData");
  return (
    <section className="max-w-xl space-y-3 rounded-xl border p-4" data-testid="download-my-data">
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("body")}</p>
      <a href="/api/account/export" download className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted" data-testid="download-my-data-link">
        {t("button")}
      </a>
    </section>
  );
}
