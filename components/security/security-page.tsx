import { getTranslations } from "next-intl/server";
import { adminMfaRequired, mfaKeyConfigured, mfaStatus } from "@/lib/auth/mfa";
import { isStaffRole } from "@/lib/auth/permissions";
import { TwoFactorPanel } from "./two-factor-panel";

/** Shared by /studio/security and /admin/security. */
export async function SecurityPage({ userId, role }: { userId: string; role: string }) {
  const t = await getTranslations("Security");
  const status = await mfaStatus(userId);
  return (
    <section className="max-w-xl space-y-3">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      <TwoFactorPanel enabled={status.enabled} backupCodesLeft={status.backupCodesLeft} keyConfigured={mfaKeyConfigured()} required={isStaffRole(role) && adminMfaRequired()} />
    </section>
  );
}
