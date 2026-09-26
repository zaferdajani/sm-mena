import { BadgeCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type BehindCardData = {
  name: string;
  handle: string;
  avatarUrl: string | null;
  memberNo: number | null;
  accounts: { id: string; name: string; logoUrl: string | null; confirmed: boolean }[];
};

/**
 * The Behind-the-Page card (marketing/05, docs/28), story-sized (1080×1920),
 * drawn by the browser so Arabic is shaped and mirrored properly (`dir`),
 * then exported to PNG by the share button (components/studio/share-card.tsx).
 */
export function BehindCard({ card, className }: { card: BehindCardData; className?: string }) {
  const t = useTranslations("Card");
  const locale = useLocale();
  const rtl = locale === "ar";
  const member = String(card.memberNo ?? 0).padStart(4, "0");
  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      lang={locale}
      className={cn("flex flex-col text-white", className)}
      style={{ width: 1080, height: 1920, padding: 72, background: "linear-gradient(160deg, #0b3d2e 0%, #13784a 55%, #1fa463 100%)", fontFamily: "var(--font-sans)" }}
      data-testid="behind-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-[40px] font-semibold">
          <span className="grid size-16 place-items-center rounded-[18px] bg-white text-[40px] text-[#13784a]">س</span>
          <span>{rtl ? "سوّق" : "Sawwiq"}</span>
        </div>
        <span className="text-[30px] opacity-85" dir="ltr">{t("tag")}</span>
      </div>

      <div className="mt-28 flex flex-col items-center text-center">
        <div className="grid size-[280px] place-items-center overflow-hidden rounded-full border-[10px] border-white/90 bg-white text-[120px] font-bold text-[#13784a]">
          {card.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.avatarUrl} alt="" width={280} height={280} className="size-full object-cover" crossOrigin="anonymous" />
          ) : (
            <span>{card.name.slice(0, 1)}</span>
          )}
        </div>
        <p className="mt-10 text-[64px] font-semibold leading-tight">{card.name}</p>
        <p className="mt-3 text-[34px] opacity-90" dir="ltr">@{card.handle}</p>
        <p className="mt-14 text-[76px] font-bold leading-[1.15]">{t("behind")}</p>
        <p className="mt-7 rounded-full bg-white/15 px-10 py-3.5 text-[40px]">{t("member", { n: member })}</p>
      </div>

      {card.accounts.length > 0 && (
        <div className="mt-20 flex flex-col">
          <p className="mb-6 text-[34px] opacity-85">{t("handles")}</p>
          <div className="flex flex-wrap gap-5">
            {card.accounts.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-center gap-4 rounded-full bg-white/15 py-3 pe-6 ps-3 text-[32px]">
                <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[30px] font-bold text-[#13784a]">
                  {a.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.logoUrl} alt="" width={64} height={64} className="size-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <span>{a.name.slice(0, 1)}</span>
                  )}
                </span>
                <span>{a.name}</span>
                {a.confirmed && <BadgeCheck className="size-8 shrink-0" aria-label={t("confirmed")} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between text-[32px] opacity-90">
        <span dir="ltr">sawwiq.org/a/{card.handle}</span>
        <span dir="ltr">{t("tag")}</span>
      </div>
    </div>
  );
}
