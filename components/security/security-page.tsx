import { getTranslations } from "next-intl/server";
import { adminMfaRequired, mfaKeyConfigured, mfaStatus } from "@/lib/auth/mfa";
import { isStaffRole } from "@/lib/auth/permissions";
import { SignInPanel } from "./sign-in-panel";
import { TwoFactorPanel } from "./two-factor-panel";

/** Shared by /studio/security and /admin/security. */
export async function SecurityPage({
  userId,
  role,
  email,
}: {
  userId: string;
  role: string;
  email: string;
}) {
  const t = await getTranslations("Security");
  const status = await mfaStatus(userId);
  return (
    <div className="space-y-10">
      <SignInPanel email={email} mfaEnabled={status.enabled} />
      <section className="max-w-xl space-y-3">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <TwoFactorPanel
          enabled={status.enabled}
          backupCodesLeft={status.backupCodesLeft}
          keyConfigured={mfaKeyConfigured()}
          required={isStaffRole(role) && adminMfaRequired()}
        />
      </section>
    </div>
  );
}
