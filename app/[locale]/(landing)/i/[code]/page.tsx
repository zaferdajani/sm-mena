import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PioneerInvite } from "@/components/pioneer/pioneer-invite";
import { getCurrentAgency } from "@/lib/auth/session";
import { invitationByCode, recordScan } from "@/lib/data/pioneers";
import { PIONEER, localizeDigits, sealNumber } from "@/lib/pioneers";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/** A letter's page is personal: never indexed, never listed. */
export async function generateMetadata({ params }: PageProps<"/[locale]/i/[code]">): Promise<Metadata> {
  const { locale, code } = await params;
  const inv = await invitationByCode(code);
  const t = await getTranslations({ locale, namespace: "Pioneer" });
  return { title: inv ? t("metaTitle", { name: inv.name }) : t("title"), robots: { index: false, follow: false } };
}

export default async function PioneerInvitePage({ params }: PageProps<"/[locale]/i/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const inv = await invitationByCode(code);
  if (!inv) notFound();
  await recordScan(inv.code);
  const me = await getCurrentAgency();
  const video = existsSync(path.join(process.cwd(), "public", "pioneers", "intro.mp4"));
  return (
    <PioneerInvite
      code={inv.code}
      name={inv.name}
      number={sealNumber(inv.number, locale)}
      cap={localizeDigits(PIONEER.cap, locale)}
      state={inv.state}
      expiresOn={new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(inv.expiresAt)}
      claimedHandle={inv.claimedHandle}
      watched={Boolean(inv.watchedAt)}
      signedIn={me ? { handle: me.handle, hasSeal: Boolean(me.pioneerNumber) } : null}
      video={video}
    />
  );
}
