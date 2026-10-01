import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { claimForMyPageAction } from "@/app/[locale]/(landing)/i/[code]/actions";
import { PioneerClaim } from "@/components/pioneer/pioneer-claim";
import { PioneerSeal } from "@/components/pioneer/pioneer-seal";

type Props = {
  code: string;
  name: string;
  number: string;
  cap: string;
  state: "open" | "claimed" | "expired";
  expiresOn: string;
  claimedHandle: string | null;
  watched: boolean;
  signedIn: { handle: string; hasSeal: boolean } | null;
  video: boolean;
};

/** The page behind the letter's QR code (docs/57): the number, the video, one button. */
export async function PioneerInvite({ code, name, number, cap, state, expiresOn, claimedHandle, watched, signedIn, video }: Props) {
  const t = await getTranslations("Pioneer");
  const locale = await getLocale();
  const primary = "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground";
  const secondary = "inline-flex min-h-12 w-full items-center justify-center rounded-full border px-6 text-base font-semibold";
  const canClaim = state === "open" && (!signedIn || !signedIn.hasSeal);
  const plainVideo = (
    <div className="mt-5 overflow-hidden rounded-2xl border bg-black">
      {video ? (
        <video className="aspect-[9/16] w-full" controls playsInline preload="metadata" poster="/pioneers/intro-poster.jpg" data-testid="pioneer-video">
          <source src="/pioneers/intro.mp4" type="video/mp4" />
          <track kind="subtitles" srcLang="en" src="/pioneers/intro.vtt" label="English" />
        </video>
      ) : (
        <div className="flex aspect-[9/16] items-center justify-center p-6 text-center text-sm text-white/80" data-testid="pioneer-video-missing">{t("videoSoon")}</div>
      )}
    </div>
  );
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 pt-6" data-testid="pioneer-invite" data-state={state}>
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("eyebrow")}</p>
      <h1 className="mt-2 text-center text-2xl font-bold">{t("greeting", { name })}</h1>
      <section className="mt-5 flex items-center gap-4 rounded-2xl border border-brand-line bg-brand-soft p-4" data-testid="pioneer-number">
        <PioneerSeal number={number} size={72} />
        <div className="min-w-0">
          <p className="text-lg font-bold">{t("numberLine", { number, cap })}</p>
          <p className="text-sm text-muted-foreground">{state === "open" ? t("holdsUntil", { date: expiresOn }) : state === "claimed" ? t("claimedLine") : t("expiredLine")}</p>
        </div>
      </section>
      {canClaim ? (
        signedIn ? (
          <form action={claimForMyPageAction.bind(null, code)}>
            <PioneerClaim code={code} locale={locale} video={video} watchedBefore={watched} mode="mine" handle={signedIn.handle} />
          </form>
        ) : (
          <PioneerClaim code={code} locale={locale} video={video} watchedBefore={watched} mode="signup" />
        )
      ) : plainVideo}
      <p className="mt-4 text-sm font-medium" data-testid="pioneer-earn">{t("earn")}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {(["private", "minutes", "permanent", "window"] as const).map((k) => <li key={k} className="flex gap-2"><span aria-hidden>✓</span><span>{t(`points.${k}`)}</span></li>)}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">{t("honest")}</p>
      <div className="mt-6 space-y-3">
        {state === "claimed" && claimedHandle && (
          <Link href={`/a/${claimedHandle}`} className={primary} data-testid="pioneer-claimed-page">{t("seePage", { handle: claimedHandle })}</Link>
        )}
        {state === "expired" && <p className="text-center text-sm" data-testid="pioneer-expired">{t("expiredHelp")}</p>}
        {state === "open" && signedIn?.hasSeal && <p className="text-center text-sm" data-testid="pioneer-have-seal">{t("haveSeal")}</p>}
        {state === "open" && !signedIn && <Link href={`/login?next=/i/${code}`} className={secondary}>{t("haveAccount")}</Link>}
        <Link href="/examples" className="block text-center text-sm text-brand underline underline-offset-4">{t("examples")}</Link>
      </div>
    </main>
  );
}
