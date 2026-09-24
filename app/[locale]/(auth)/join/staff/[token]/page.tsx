import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getInviteByToken } from "@/lib/data/staff";
import { AcceptStaffForm } from "./accept-form";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function JoinStaff({ params }: PageProps<"/[locale]/join/staff/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AdminTeam.accept");
  const tr = await getTranslations("AdminTeam.roles");
  const invite = await getInviteByToken(token);
  if (!invite) {
    return (
      <>
        <h1 className="text-xl font-bold">{t("invalidTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("invalidBody")}</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand">
          {t("toLogin")}
        </Link>
      </>
    );
  }
  const role = invite.role as "support";
  return (
    <>
      <h1 className="text-xl font-bold">{t("title", { role: tr(`${role}.name`) })}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{tr(`${role}.body`)}</p>
      <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm" dir="ltr">
        {invite.email}
      </p>
      <AcceptStaffForm token={token} />
      <p className="mt-4 text-xs text-muted-foreground">{t("next")}</p>
    </>
  );
}
