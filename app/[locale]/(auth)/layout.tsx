import { BrandLockup } from "@/components/brand-lockup";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Header");
  return (
    <div data-design-surface="auth" className="sw-auth flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 font-heading text-3xl font-bold text-brand" translate="no">
        <BrandLockup label={t("brand")} />
      </Link>
      <div className="sw-auth-card w-full max-w-lg rounded-2xl border bg-card p-6 shadow-card">{children}</div>
    </div>
  );
}
