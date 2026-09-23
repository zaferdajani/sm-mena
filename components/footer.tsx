import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("Footer");
  return (
    <footer className="border-t border-border">
      <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted-foreground">
        {t("rights", { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
