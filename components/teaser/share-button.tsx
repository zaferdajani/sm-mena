"use client";

import { MessageCircle, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** WhatsApp first (docs/39), then the native share sheet on phones or copying the link. */
export function ShareButton({ url }: { url: string }) {
  const t = useTranslations("Teaser");
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const text = t("shareText");
    try {
      if (navigator.share) return await navigator.share({ text, url });
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${t("shareText")} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-5 py-2.5 text-sm font-bold text-black"
        data-testid="teaser-whatsapp"
      >
        <MessageCircle className="size-4" aria-hidden />
        {t("whatsapp")}
      </a>
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white"
        data-testid="teaser-share"
      >
        <Share2 className="size-4" aria-hidden />
        <span role="status">{copied ? t("copied") : t("share")}</span>
      </button>
    </div>
  );
}
