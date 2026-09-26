import { setRequestLocale } from "next-intl/server";
import { SecurityPage } from "@/components/security/security-page";
import { CloseAccount } from "@/components/studio/close-account";
import { requireAgency } from "@/lib/auth/guards";

export default async function StudioSecurity({ params }: PageProps<"/[locale]/studio/security">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user, agency } = await requireAgency();
  return (
    <div className="space-y-8">
      <SecurityPage userId={user.id} role={user.role} email={user.email} />
      <div className="max-w-xl">
        <CloseAccount handle={agency.handle} />
      </div>
    </div>
  );
}
