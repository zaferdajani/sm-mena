"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

/** Private client link with copy and WhatsApp buttons. The origin is read in the browser. */
export function ShareLink({ path, phone, name, title }: { path: string; phone: string; name: string; title: string }) {
  const t = useTranslations("Contracts.share");
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setUrl(`${window.location.origin}${path}`), 0);
    return () => clearTimeout(id);
  }, [path]);
  const wa = `https://wa.me/${phone.replace(/[^\d]/g, "").replace(/^0/, "962")}?text=${encodeURIComponent(t("message", { name, title, url }))}`;
  return (
    <section className="space-y-2 rounded-2xl border-2 border-brand/40 bg-brand/5 p-4" data-testid="share-link">
      <p className="font-semibold">{t("title")}</p>
      <p className="text-xs text-muted-foreground">{t("body")}</p>
      <p className="break-all rounded-lg bg-background p-2 font-mono text-xs" dir="ltr" data-testid="client-link">{url}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            navigator.clipboard?.writeText(url);
            setCopied(true);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? t("copied") : t("copy")}
        </Button>
        <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: "gap-1.5 bg-[#25D366] text-white hover:bg-[#1ebe5b]" })}>
          <MessageCircle className="size-4" /> {t("whatsapp")}
        </a>
      </div>
    </section>
  );
}
