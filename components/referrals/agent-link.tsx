"use client";

import { Copy, MessageCircle, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** The agent's personal sign-up link: copy, WhatsApp or the phone's share sheet (docs/42). */
export function AgentLink({ url, code }: { url: string; code: string }) {
  const t = useTranslations("Agent");
  const [copied, setCopied] = useState(false);
  const text = `${t("shareText")} ${url}`;
  const copy = async () => {
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const share = async () => {
    if (navigator.share) await navigator.share({ text, url }).catch(() => {});
    else await copy();
  };
  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-muted px-3 py-2 font-mono text-sm break-all" dir="ltr" data-testid="agent-link">{url}</p>
      <p className="text-xs text-muted-foreground">
        {t("codeHint")} <b className="font-mono" dir="ltr" data-testid="agent-code">{code}</b>
      </p>
      <div className="flex flex-wrap gap-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-2 text-sm font-bold text-black">
          <MessageCircle className="size-4" aria-hidden /> {t("whatsapp")}
        </a>
        <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold">
          <Share2 className="size-4" aria-hidden /> {t("share")}
        </button>
        <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold">
          <Copy className="size-4" aria-hidden /> <span role="status">{copied ? t("copied") : t("copy")}</span>
        </button>
      </div>
    </div>
  );
}
