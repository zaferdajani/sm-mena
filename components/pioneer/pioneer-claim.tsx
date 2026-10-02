"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { markWatchedAction } from "@/app/[locale]/(landing)/i/[code]/actions";

/**
 * The video and the one button (docs/57). The seal is earned: the button opens only after
 * the introduction has played to the end (or at once when no video is deployed yet).
 */
export function PioneerClaim({ code, locale, video, watchedBefore, mode, handle }: { code: string; locale: string; video: boolean; watchedBefore: boolean; mode: "signup" | "mine"; handle?: string }) {
  const t = useTranslations("Pioneer");
  const [watched, setWatched] = useState(!video || watchedBefore);
  const [, start] = useTransition();
  const primary = "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground aria-disabled:opacity-50 disabled:opacity-50";
  return (
    <>
      <div className="mt-5 overflow-hidden rounded-2xl border bg-black">
        {video ? (
          <video
            className="aspect-[9/16] w-full"
            controls
            playsInline
            preload="metadata"
            poster="/pioneers/intro-poster.jpg"
            data-testid="pioneer-video"
            onEnded={() => start(async () => { await markWatchedAction(code); setWatched(true); })}
          >
            <source src="/pioneers/intro.mp4" type="video/mp4" />
            <track kind="subtitles" srcLang="en" src="/pioneers/intro.vtt" label="English" />
          </video>
        ) : (
          <div className="flex aspect-[9/16] items-center justify-center p-6 text-center text-sm text-white/80" data-testid="pioneer-video-missing">{t("videoSoon")}</div>
        )}
      </div>
      <p className="mt-3 text-center text-sm" role="status" data-testid="pioneer-watch-state" data-watched={watched}>{watched ? t("watched") : t("watchFirst")}</p>
      <div className="mt-4">
        {mode === "signup" ? (
          <a href={`/${locale}/i/${code}/claim`} aria-disabled={!watched} className={primary} onClick={(e) => { if (!watched) e.preventDefault(); }} data-testid="pioneer-claim">{t("claim")}</a>
        ) : (
          <button type="submit" disabled={!watched} className={primary} data-testid="pioneer-claim-mine">{t("claimMine", { handle: handle ?? "" })}</button>
        )}
      </div>
    </>
  );
}
