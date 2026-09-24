import { setRequestLocale } from "next-intl/server";
import { SecurityPage } from "@/components/security/security-page";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminSecurity({ params }: PageProps<"/[locale]/admin/security">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // The one admin page reachable before enrolment, so the admin can turn 2FA on.
  const user = await requireAdmin({ allowEnroll: true });
  return <SecurityPage userId={user.id} role={user.role} />;
}
