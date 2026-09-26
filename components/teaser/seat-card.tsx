"use client";

import { Download, MessageCircle, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { seatLabel } from "@/lib/teaser";

const W = 1080;
const H = 1920;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** The site's own fonts, as next/font named them, so the card matches the page. */
function fontFamily(variable: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v || "sans-serif";
}

/**
 * The founding seat card in the studio (docs/39): a 1080×1920 story image drawn
 * in the browser (so Arabic is shaped properly), to share or save.
 */
export function SeatCard({ seat, citySeat, city, name, locale, url }: { seat: number; citySeat: number; city: string; name: string; locale: string; url: string }) {
  const t = useTranslations("Seat");
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const cityLine = t("cardCity", { n: citySeat, city });

  useEffect(() => {
    let live = true;
    (async () => {
      const el = canvas.current;
      const ctx = el?.getContext("2d");
      if (!el || !ctx) return;
      await document.fonts.ready;
      const bg = await loadImage("/teaser/invite-4x5.webp").catch(() => null);
      if (!live) return;
      ctx.fillStyle = "#06120c";
      ctx.fillRect(0, 0, W, H);
      if (bg) {
        // Cover the card, centred.
        const s = Math.max(W / bg.width, H / bg.height);
        ctx.drawImage(bg, (W - bg.width * s) / 2, (H - bg.height * s) / 2, bg.width * s, bg.height * s);
      }
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, W, H);
      const heading = fontFamily("--font-readex");
      const body = fontFamily("--font-plex-arabic");
      const gold = ctx.createLinearGradient(0, 700, 0, 1100);
      gold.addColorStop(0, "#f3dca2");
      gold.addColorStop(1, "#d9ae55");
      ctx.textAlign = "center";
      ctx.direction = locale === "ar" ? "rtl" : "ltr";
      ctx.fillStyle = "#f3dca2";
      ctx.font = `600 64px ${heading}`;
      ctx.fillText(t("cardTop"), W / 2, 560);
      ctx.fillStyle = "#ffffff";
      ctx.font = `600 56px ${body}`;
      ctx.fillText(name.slice(0, 32), W / 2, 660);
      ctx.fillStyle = gold;
      ctx.direction = "ltr";
      ctx.font = `700 230px ${fontFamily("--font-plex-mono")}`;
      ctx.fillText(seatLabel(seat), W / 2, 1000);
      ctx.direction = locale === "ar" ? "rtl" : "ltr";
      ctx.fillStyle = "#f3dca2";
      ctx.font = `600 60px ${heading}`;
      ctx.fillText(t("cardSeat"), W / 2, 1110);
      ctx.fillStyle = "#ffffff";
      ctx.font = `500 52px ${body}`;
      ctx.fillText(cityLine, W / 2, 1200);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `600 44px ${body}`;
      ctx.direction = "ltr";
      ctx.fillText(t("cardUrl"), W / 2, 1560);
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, [seat, citySeat, cityLine, name, locale, t]);

  const blob = () => new Promise<Blob | null>((resolve) => canvas.current?.toBlob(resolve, "image/png") ?? resolve(null));
  const fileName = `sawwiq-seat-${seat}.png`;
  const save = async () => {
    const b = await blob();
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const share = async () => {
    const b = await blob();
    if (!b) return;
    const file = new File([b], fileName, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], text: `${t("whatsappText")} ${seatLabel(seat)} ${url}` });
    } catch {
      return;
    }
    await save();
  };

  return (
    <section className="teaser-night overflow-hidden rounded-2xl border border-[var(--gold)]/30 bg-background p-4 text-foreground" data-testid="seat-card">
      <div className="flex items-center gap-4">
        <canvas ref={canvas} width={W} height={H} className="h-40 w-auto shrink-0 rounded-lg border border-[var(--gold)]/30" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--gold-soft)]">{t("title")}</h2>
          <p className="teaser-gold-text font-mono text-4xl font-bold tabular-nums" dir="ltr" data-testid="seat-number">
            {seatLabel(seat)}
          </p>
          <p className="text-sm">{t("city", { n: citySeat, city })}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("note")}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={share} disabled={!ready} className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
          <Share2 className="size-4" aria-hidden />
          {t("share")}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${t("whatsappText")} ${seatLabel(seat)}\n${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-2 text-sm font-bold text-black"
          data-testid="seat-whatsapp"
        >
          <MessageCircle className="size-4" aria-hidden />
          {t("whatsapp")}
        </a>
        <button type="button" onClick={save} disabled={!ready} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50">
          <Download className="size-4" aria-hidden />
          {t("save")}
        </button>
      </div>
    </section>
  );
}
