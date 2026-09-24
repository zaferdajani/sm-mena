import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Header");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 font-heading text-3xl font-bold text-brand" translate="no">
        <Image src="/brand/mark-192.png" alt="" width={40} height={40} className="rounded-xl" priority />
        {t("brand")}
      </Link>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-card">{children}</div>
    </div>
  );
}
