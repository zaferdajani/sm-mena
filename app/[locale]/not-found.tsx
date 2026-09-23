import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <section className="mx-auto max-w-5xl px-4 py-20">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <Link href="/" className="mt-6 inline-block text-brand underline">
        {t("home")}
      </Link>
    </section>
  );
}
