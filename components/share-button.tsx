"use client";

import { MessageCircle, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Share a page: the device's own share sheet when there is one, otherwise the
 * text and link go to the clipboard; WhatsApp is one tap away either way.
 */
export function ShareActions({ url, title, text, label, className, buttonClassName, testId = "share", variant = "outline" }: { url: string; title: string; text: string; label: string; className?: string; buttonClassName?: string; testId?: string; variant?: "outline" | "primary" }) {
  const tc = useTranslations("Common");
  const [copied, setCopied] = useState(false);
  const message = `${text} ${url}`;
  const share = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        return; // the person closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard refused: the WhatsApp link still works */
    }
  };
  const base = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium";
  const look = variant === "primary" ? "border-brand bg-brand text-white hover:brightness-95" : "border-border bg-card hover:bg-accent";
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button type="button" onClick={() => void share()} data-testid={testId} className={cn(base, look, buttonClassName)}>
        <Share2 className="size-4 shrink-0" aria-hidden />
        <span>{label}</span>
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`${testId}-whatsapp`}
        aria-label={tc("shareWhatsapp")}
        title={tc("shareWhatsapp")}
        className={cn(base, "border-border bg-card hover:bg-accent", buttonClassName)}
      >
        <MessageCircle className="size-4 shrink-0" aria-hidden />
        <span>WhatsApp</span>
      </a>
      <span role="status" aria-live="polite" className="text-xs text-muted-foreground" data-testid={`${testId}-status`}>{copied ? tc("copied") : ""}</span>
    </div>
  );
}
