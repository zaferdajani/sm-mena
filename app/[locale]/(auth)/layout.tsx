import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Header");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <Link href="/" className="mb-6 text-3xl font-bold text-brand">
        {t("brand")}
      </Link>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
    </div>
  );
}
