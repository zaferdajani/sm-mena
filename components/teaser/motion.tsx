"use client";

import { useEffect, useRef, useState } from "react";
import { seatLabel } from "@/lib/teaser";
import { cn } from "@/lib/utils";

/**
 * Small, honest motion for the pre-launch page (docs/39): numbers that count
 * up once when they come into view, sections that rise in as you scroll, and
 * a marquee that pauses under the finger. Everything stops for people who
 * asked their device for reduced motion.
 */

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Adds `is-in` once the element is on screen (CSS does the rest). */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("teaser-reveal", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Counts from 0 to `value` over ~1.2 s the first time it is seen; renders the final value at once without motion. */
export function CountUp({ value, seat = false }: { value: number; /** Show as a seat number (#0042). */ seat?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(reduced() ? value : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1200);
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return <span ref={ref}>{seat ? seatLabel(n) : String(n)}</span>;
}

/** A row that scrolls sideways forever; the content is doubled so the loop is seamless. */
export function Marquee({ children, reverse = false, className }: { children: React.ReactNode; reverse?: boolean; className?: string }) {
  return (
    <div className={cn("teaser-marquee", className)} dir="ltr">
      <div className={cn("teaser-marquee__track", reverse && "teaser-marquee__track--reverse")}>
        <div className="flex shrink-0 gap-2 pe-2">{children}</div>
        <div className="flex shrink-0 gap-2 pe-2" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Lines shown one at a time, fading through them every few seconds (the "just claimed" ticker). */
export function Rotator({ items, interval = 3200, className }: { items: React.ReactNode[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2 || reduced()) return;
    const id = setInterval(() => setI((x) => (x + 1) % items.length), interval);
    return () => clearInterval(id);
  }, [items.length, interval]);
  if (!items.length) return null;
  return (
    <div className={cn("relative", className)} aria-live="polite">
      <div key={i} className="teaser-fade-in">
        {items[i]}
      </div>
    </div>
  );
}
