"use client";

import { Download, Share2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { BehindCard, type BehindCardData } from "@/components/profile/behind-card";
import { Button } from "@/components/ui/button";

/**
 * The agency's Behind-the-Page card (marketing/05): a live preview, and
 * Download / Share, which rasterise the card the browser drew (so Arabic
 * comes out exactly as on screen) into a 1080×1920 PNG.
 */
export function ShareCard({ card }: { card: BehindCardData }) {
  const t = useTranslations("Studio.card");
  const locale = useLocale();
  const full = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const toPng = async () => {
    const { domToBlob } = await import("modern-screenshot");
    const node = full.current!;
    const blob = await domToBlob(node, { width: 1080, height: 1920, scale: 1, type: "image/png", features: { removeControlCharacter: false } });
    return new File([blob], `sawwiq-${card.handle}.png`, { type: "image/png" });
  };
  const download = async () => {
    setBusy(true);
    try {
      const file = await toPng();
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    setBusy(true);
    try {
      const file = await toPng();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: locale === "ar" ? "#وراء_الصفحة" : "#BehindThePage" });
      } else {
        await download();
        setNote(t("saved"));
      }
    } catch {
      /* the person closed the share sheet */
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-xl border p-4" data-testid="share-card">
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("hint")}</p>
      <div className="mt-3 flex flex-wrap items-start gap-4">
        {/* Preview: the real card scaled down. */}
        <div className="h-[320px] w-[180px] shrink-0 overflow-hidden rounded-lg border" data-testid="share-card-preview">
          <div style={{ transform: "scale(0.1667)", transformOrigin: "top left" }}>
            <BehindCard card={card} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => void download()} data-testid="share-card-download">
            <Download className="size-4" /> {t("download")}
          </Button>
          <Button type="button" size="sm" className="gap-1.5" disabled={busy} onClick={() => void share()} data-testid="share-card-share">
            <Share2 className="size-4" /> {t("share")}
          </Button>
          {note && <p className="text-xs text-muted-foreground" role="status">{note}</p>}
        </div>
      </div>
      {/* Full-size copy, off screen, that the PNG is made from. */}
      <div aria-hidden className="pointer-events-none fixed -start-[3000px] top-0">
        <div ref={full}>
          <BehindCard card={card} />
        </div>
      </div>
    </section>
  );
}
