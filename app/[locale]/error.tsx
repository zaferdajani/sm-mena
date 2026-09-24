"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { reportClientError } from "@/components/error-reporter";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// Shown when a page crashes. The error goes to Admin → Bugs automatically.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Support");
  useEffect(() => {
    reportClientError("render_error", error.message || `digest ${error.digest}`, error.stack);
  }, [error]);
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
      <h1 className="text-xl font-bold">{t("crashTitle")}</h1>
      <p className="text-sm text-muted-foreground">{t("crashBody")}</p>
      <div className="flex justify-center gap-2">
        <Button onClick={reset}>{t("retry")}</Button>
        <Link href="/support" className={buttonVariants({ variant: "outline" })}>
          {t("reportLink")}
        </Link>
      </div>
    </div>
  );
}
