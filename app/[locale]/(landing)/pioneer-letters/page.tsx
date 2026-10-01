import QRCode from "qrcode";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PioneerLetter } from "@/components/pioneer/pioneer-letter";
import { requireStaff } from "@/lib/auth/guards";
import { invitationByCode, listInvitations, type InvitationView } from "@/lib/data/pioneers";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The printable letters (docs/57): A5, Arabic on the front and English on the back, one per
 * invitation, each with its own QR code. Staff only. Print → Save as PDF.
 */
export default async function PioneerLettersPage({ params, searchParams }: PageProps<"/[locale]/pioneer-letters">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("prospects.manage");
  const q = await searchParams;
  const code = typeof q.code === "string" ? q.code : "";
  const list: InvitationView[] = code ? [await invitationByCode(code)].filter((i): i is InvitationView => Boolean(i)) : (await listInvitations()).filter((i) => i.state !== "claimed");
  const t = await getTranslations("Pioneer.letter");
  const letters = await Promise.all(
    list.map(async (i) => ({ invitation: i, qr: await QRCode.toString(`${SITE_URL}/i/${i.code}`, { type: "svg", margin: 0, errorCorrectionLevel: "M" }) })),
  );
  return (
    <div className="pioneer-letters" data-testid="pioneer-letters" data-count={letters.length}>
      <p className="print:hidden mx-auto max-w-2xl px-4 py-3 text-sm text-muted-foreground">{t("printHint", { count: letters.length })}</p>
      {letters.map(({ invitation, qr }) => <PioneerLetter key={invitation.id} invitation={invitation} qrSvg={qr} />)}
    </div>
  );
}
