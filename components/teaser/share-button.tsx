"use client";

import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** Native share sheet on phones; elsewhere copy the link. */
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
    <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-full border border-current/30 px-5 py-2.5 text-sm font-semibold" data-testid="teaser-share">
      <Share2 className="size-4" aria-hidden />
      <span role="status">{copied ? t("copied") : t("share")}</span>
    </button>
  );
}
