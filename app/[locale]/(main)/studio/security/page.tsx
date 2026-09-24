import { setRequestLocale } from "next-intl/server";
import { SecurityPage } from "@/components/security/security-page";
import { requireAgency } from "@/lib/auth/guards";

export default async function StudioSecurity({ params }: PageProps<"/[locale]/studio/security">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user } = await requireAgency();
  return <SecurityPage userId={user.id} role={user.role} />;
}
