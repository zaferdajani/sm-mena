"use client";

import { Play, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * "Try the app": the app mall's sandbox in a frame (docs/37). The frame is
 * sandboxed on our side too; the app mall sets its own frame-ancestors and
 * sandbox headers, so nothing here can loosen its containment.
 */
export function TryApp({ url, name }: { url: string; name: string }) {
  const t = useTranslations("Post.app");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" className="gap-1.5" onClick={() => setOpen(true)} data-testid="try-app">
        <Play className="size-4" /> {t("try")}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label={t("tryTitle", { name })} data-testid="try-app-frame">
          <div className="flex items-center gap-3 border-b px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" dir="auto">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{t("sandboxNote")}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label={t("close")}>
              <X className="size-4" />
            </Button>
          </div>
          <iframe src={url} title={t("tryTitle", { name })} className="min-h-0 flex-1 w-full border-0 bg-white" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-pointer-lock" allow="fullscreen" referrerPolicy="strict-origin" />
        </div>
      )}
    </>
  );
}
