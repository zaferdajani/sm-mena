"use client";

import { Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import styles from "./intro-sting.module.css";

// Versioned so visitors who saw the old cropped/mobile-only intro can see the repair.
const SEEN_KEY = "sw_intro_v2";
export const INTRO_DONE_EVENT = "sw-intro-done";

/** Same gate on an initial document and client-side navigation. No width restriction. */
function shouldPlayIntro() {
  const forced = new URLSearchParams(window.location.search).get("intro");
  if (forced === "0" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (forced === "1") return true;
  if (navigator.webdriver) return false;
  try { return !sessionStorage.getItem(SEEN_KEY); } catch { return true; }
}

// Hidden in server markup (including no-JS visits). The parser opens it before
// first paint when eligible. The effect repeats the gate for SPA navigation,
// where an inserted inline script is not a dependable lifecycle hook.
// The native Skip handler works before (or without) hydration, so a visitor
// whose JavaScript is slow or blocked is never stuck behind the overlay.
const gateScript = `(function(){var el=document.getElementById("sw-intro");if(!el)return;try{var q=new URLSearchParams(location.search).get("intro");var reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;var seen=false;try{seen=!!sessionStorage.getItem("${SEEN_KEY}")}catch(e){}var show=q!=="0"&&!reduced&&(q==="1"||(!navigator.webdriver&&!seen));el.hidden=!show;if(show){document.documentElement.dataset.intro="playing";var b=el.querySelector('[data-testid="intro-skip"]');if(b)b.addEventListener("click",function(){el.hidden=true;delete document.documentElement.dataset.intro;try{sessionStorage.setItem("${SEEN_KEY}","1")}catch(e){}window.dispatchEvent(new Event("${INTRO_DONE_EVENT}"))},{once:true})}}catch(e){el.hidden=true}})();`;

export function introPlaying() {
  return typeof document !== "undefined" && document.documentElement.dataset.intro === "playing";
}

/** Muted autoplay first; sound is enabled only by the visitor's explicit tap. */
export function IntroSting() {
  const t = useTranslations("Intro");
  const ref = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const close = useRef<() => void>(() => undefined);
  const [muted, setMuted] = useState(true);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const v = video.current;
    if (!el || !v) return;
    if (!shouldPlayIntro()) {
      el.hidden = true;
      delete document.documentElement.dataset.intro;
      return;
    }
    el.hidden = false;
    delete el.dataset.leaving;
    document.documentElement.dataset.intro = "playing";
    const background = document.querySelector<HTMLElement>(".sw");
    const wasInert = background?.inert ?? false;
    const previousFocus = document.activeElement;
    const previousOverflow = document.documentElement.style.overflow;
    if (background) background.inert = true;
    document.documentElement.style.overflow = "hidden";
    el.focus({ preventScroll: true });
    let finishing = false;
    let released = false;
    let disposed = false;
    let exitTimer: number | undefined;
    const release = () => {
      if (released) return;
      released = true;
      if (background) background.inert = wasInert;
      document.documentElement.style.overflow = previousOverflow;
      delete document.documentElement.dataset.intro;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
      window.dispatchEvent(new Event(INTRO_DONE_EVENT));
    };
    const finish = () => {
      if (finishing || disposed) return;
      finishing = true;
      v.pause();
      el.dataset.leaving = "true";
      try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* blocked storage is harmless */ }
      exitTimer = window.setTimeout(() => {
        el.hidden = true;
        release();
        setGone(true);
      }, 200);
    };
    close.current = finish;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); finish(); }
      if (event.key !== "Tab") return;
      const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === el)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === el)) {
        event.preventDefault(); first.focus();
      }
    };
    el.addEventListener("keydown", onKey);
    v.muted = true;
    v.preload = "auto";
    void v.play().catch(finish);
    const stallTimer = window.setTimeout(() => { if (v.currentTime === 0) finish(); }, 2500);
    const capTimer = window.setTimeout(finish, 6500);
    return () => {
      disposed = true;
      v.pause();
      window.clearTimeout(stallTimer);
      window.clearTimeout(capTimer);
      window.clearTimeout(exitTimer);
      el.removeEventListener("keydown", onKey);
      close.current = () => undefined;
      release();
    };
  }, []);

  function soundOn() {
    const v = video.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    setMuted(false);
    void v.play().catch(() => { v.muted = true; setMuted(true); });
  }

  if (gone) return null;
  return (
    <>
      <div ref={ref} id="sw-intro" hidden suppressHydrationWarning role="dialog" aria-modal="true"
        aria-label={t("label")} tabIndex={-1} data-testid="intro-sting" className={styles.overlay}>
        <video ref={video} className={styles.video} muted={muted} playsInline preload="none"
          poster="/assets/brand/intro/sawwiq-intro-poster.jpg"
          onEnded={() => close.current()} onError={() => close.current()} aria-hidden="true">
          <source src="/assets/brand/intro/sawwiq-intro-720.webm" type="video/webm" />
          <source src="/assets/brand/intro/sawwiq-intro-720.mp4" type="video/mp4" />
        </video>
        <button type="button" onClick={() => close.current()} className={styles.skip} data-testid="intro-skip">{t("skip")}</button>
        {muted && <button type="button" onClick={soundOn} className={styles.sound} data-testid="intro-sound">
          <Volume2 className="size-4" aria-hidden="true" />{t("soundOn")}
        </button>}
      </div>
      <script dangerouslySetInnerHTML={{ __html: gateScript }} />
    </>
  );
}
