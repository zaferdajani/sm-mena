import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

export function Header() {
  const t = useTranslations("Header");
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-brand">
          {t("brand")}
        </Link>
        <LocaleSwitcher
          label={t("switchLocale")}
          ariaLabel={t("switchLocaleLabel")}
        />
      </div>
    </header>
  );
}
