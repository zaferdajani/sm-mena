import { useLocale, useTranslations } from "next-intl";
import { FOOTER_SERVICES } from "@/components/shell/site-footer";
import { Link } from "@/i18n/navigation";
import { serviceLinkText } from "@/lib/hire-content";

// A real 404 (status and noindex come from Next.js) that offers ways forward
// instead of a dead end: the hire hubs and the most searched services.
export default function NotFound() {
  const t = useTranslations("NotFound");
  const locale = useLocale();
  return (
    <section className="mx-auto max-w-2xl space-y-6 px-4 py-20">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("body")}</p>
      <div className="flex flex-wrap gap-4 text-sm font-medium">
        <Link href="/" className="text-brand underline">{t("home")}</Link>
        <Link href="/hire" className="text-brand underline">{t("hire")}</Link>
        <Link href="/explore" className="text-brand underline">{t("explore")}</Link>
      </div>
      <ul className="flex flex-wrap gap-2">
        {FOOTER_SERVICES.map((s) => (
          <li key={s}>
            <Link href={`/hire/${s}`} className="inline-block rounded-full border px-3 py-1 text-sm hover:bg-muted">
              {serviceLinkText(s, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
