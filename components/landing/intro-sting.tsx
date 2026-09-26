"use client";

import { Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "sw_intro";
export const INTRO_DONE_EVENT = "sw-intro-done";

/**
 * Runs before first paint, right after the overlay's markup: the logo sting
 * plays once per session, on phones only, and never for reduced motion or
 * automated browsers (`?intro=1` lifts the last two). Otherwise the overlay is hidden
 * before the visitor sees it, so returning visitors and crawlers get the page
 * as is.
 */
const gateScript = `(function(){try{var el=document.getElementById("sw-intro");if(!el)return;var q=location.search.indexOf("intro=1")>-1;var skip=(!q&&(navigator.webdriver||sessionStorage.getItem("${SEEN_KEY}")))||!matchMedia("(max-width: 767px)").matches||matchMedia("(prefers-reduced-motion: reduce)").matches;if(skip){el.hidden=true}else{document.documentElement.dataset.intro="playing"}}catch(e){var x=document.getElementById("sw-intro");if(x)x.hidden=true}})();`;

/** True while the intro is on screen; the welcome question waits for it. */
export function introPlaying() {
  return typeof document !== "undefined" && document.documentElement.dataset.intro === "playing";
}

/**
 * The mobile landing opens with the Sawwiq logo sting (Higgsfield film with
 * its sonic logo). Browsers only allow sound after a tap, so it tries with
 * sound, falls back to muted, and offers "Sound on", which replays it aloud.
 */
export function IntroSting() {
  const t = useTranslations("Intro");
  const ref = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const v = video.current;
    if (!el || el.hidden || !v) return;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage blocked: it simply plays again next visit.
    }
    v.muted = false;
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => close());
    });
    // Never hold the page hostage to a slow or stalled video.
    const stall = window.setTimeout(() => {
      if (v.currentTime === 0) close();
    }, 2500);
    const cap = window.setTimeout(close, 9000);
    return () => {
      window.clearTimeout(stall);
      window.clearTimeout(cap);
    };
  }, []);

  function close() {
    setLeaving(true);
    window.setTimeout(() => {
      setGone(true);
      delete document.documentElement.dataset.intro;
      window.dispatchEvent(new Event(INTRO_DONE_EVENT));
    }, 300);
  }

  function soundOn() {
    const v = video.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    setMuted(false);
    void v.play().catch(() => undefined);
  }

  if (gone) return null;
  return (
    <>
      <div
        ref={ref}
        id="sw-intro"
        suppressHydrationWarning
        role="dialog"
        aria-label={t("label")}
        data-testid="intro-sting"
        className={`fixed inset-0 z-[90] flex items-center justify-center bg-[#f7f5ee] transition-opacity duration-300 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <video
          ref={video}
          className="h-full w-full object-cover"
          playsInline
          preload="auto"
          poster="/assets/brand/intro/sawwiq-intro-poster.jpg"
          onEnded={close}
          aria-hidden="true"
        >
          <source src="/assets/brand/intro/sawwiq-intro-720.webm" type="video/webm" />
          <source src="/assets/brand/intro/sawwiq-intro-720.mp4" type="video/mp4" />
        </video>
        <button
          type="button"
          onClick={close}
          className="absolute end-4 top-4 rounded-full bg-black/5 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-sm"
          data-testid="intro-skip"
        >
          {t("skip")}
        </button>
        {muted && (
          <button
            type="button"
            onClick={soundOn}
            className="absolute bottom-8 start-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg rtl:translate-x-1/2"
            data-testid="intro-sound"
          >
            <Volume2 className="size-4" aria-hidden="true" />
            {t("soundOn")}
          </button>
        )}
      </div>
      <script dangerouslySetInnerHTML={{ __html: gateScript }} />
    </>
  );
}
