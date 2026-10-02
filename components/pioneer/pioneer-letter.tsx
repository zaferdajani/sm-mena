import { getTranslations } from "next-intl/server";
import { PioneerSeal } from "@/components/pioneer/pioneer-seal";
import type { InvitationView } from "@/lib/data/pioneers";
import { PIONEER, localizeDigits } from "@/lib/pioneers";

const date = (d: Date, locale: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(d);

/** One A5 sheet per side: Arabic, then English, each with the same QR. Letters carry no medal number: medals are numbered in claim order. */
export async function PioneerLetter({ invitation, qrSvg }: { invitation: InvitationView; qrSvg: string }) {
  const sides = [
    { locale: "ar", dir: "rtl" as const },
    { locale: "en", dir: "ltr" as const },
  ];
  return (
    <>
      {await Promise.all(
        sides.map(async ({ locale, dir }) => {
          const t = await getTranslations({ locale, namespace: "Pioneer.letter" });
          const cap = localizeDigits(PIONEER.cap, locale);
          return (
            <article key={locale} dir={dir} lang={locale} className="pioneer-letter" data-testid="pioneer-letter" data-locale={locale} data-code={invitation.code}>
              <header className="pioneer-letter__head">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/mark-192.png" alt="Sawwiq" width={40} height={40} />
                <span className="pioneer-letter__eyebrow">{t("eyebrow", { cap })}</span>
              </header>
              <h1 className="pioneer-letter__title">{t("headline")}</h1>
              <p className="pioneer-letter__to">{t("to", { name: invitation.name })}</p>
              <p>{t("p1")}</p>
              <p>{t("p2", { cap })}</p>
              <p>{t("p3")}</p>
              <div className="pioneer-letter__seal">
                <PioneerSeal number="" size={96} />
                <div>
                  <p className="pioneer-letter__number">{t("numberLine", { cap })}</p>
                  <p className="pioneer-letter__expiry">{t("expiry", { date: date(invitation.expiresAt, locale) })}</p>
                </div>
                <div className="pioneer-letter__qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              </div>
              <p className="pioneer-letter__caption">{t("qrCaption")} <span dir="ltr">sawwiq.org/i/{invitation.code}</span></p>
              <footer className="pioneer-letter__foot">
                <p>{t("signature")}</p>
                <p className="pioneer-letter__honest">{t("honest")}</p>
              </footer>
            </article>
          );
        }),
      )}
    </>
  );
}
