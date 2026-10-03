"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type HeroSlide = { src: string; title: string };

/**
 * The landing's hero visual as a few calm slides: one photo and one bold statement at a time, a slow
 * cross-fade, dots to pick a slide. Auto-advance pauses on hover, focus and a hidden tab, and never runs
 * when the visitor prefers reduced motion; the first slide is server-rendered, so nothing moves before
 * React is ready and the statement is in the HTML for search engines.
 */
export function HeroSlides({ slides, label, dotLabels, intervalMs = 6500 }: { slides: HeroSlide[]; label: string; dotLabels: string[]; intervalMs?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;
    const tick = () => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % slides.length);
    };
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [slides.length, paused, intervalMs]);

  return (
    <div
      ref={root}
      className="registration-hero-photo registration-hero-product registration-slides"
      data-testid="hero-slides"
      data-active-index={index}
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!root.current?.contains(e.relatedTarget as Node | null)) setPaused(false); }}
    >
      {slides.map((slide, i) => (
        <figure key={slide.src} className="registration-slide" data-active={i === index} aria-hidden={i !== index} role="group" aria-roledescription="slide" aria-label={dotLabels[i]}>
          <Image src={slide.src} alt="" fill priority={i === 0} loading={i === 0 ? "eager" : "lazy"} sizes="(min-width: 900px) 48vw, 92vw" />
          <figcaption className="registration-photo-caption registration-slide-caption"><strong>{slide.title}</strong></figcaption>
        </figure>
      ))}
      {slides.length > 1 && (
        <div className="registration-slide-dots" role="tablist" aria-label={label}>
          {slides.map((slide, i) => (
            <button key={slide.src} type="button" role="tab" aria-selected={i === index} aria-label={dotLabels[i]} data-testid={`hero-slide-dot-${i + 1}`} onClick={() => setIndex(i)}>
              <span aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
