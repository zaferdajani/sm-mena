import { FlaskConical, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/**
 * Who holds the money, stated plainly on every contract and checkout screen
 * (lib/payments/readiness.ts). `live` is the contract's own state when it was
 * sent (what its terms say), or the platform's state for a new contract.
 */
export async function ReadinessBanner({ live, compact = false }: { live: boolean; compact?: boolean }) {
  const t = await getTranslations("Contracts.readiness");
  const Icon = live ? ShieldCheck : FlaskConical;
  return (
    <div className={cn("flex items-start gap-2 rounded-xl p-3 text-sm", live ? "bg-brand/5" : "bg-amber-500/10")} role="note" data-testid="payments-readiness" data-live={live ? "true" : "false"}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", live ? "text-brand" : "text-amber-600")} />
      <p>
        <b className="block">{t(live ? "liveTitle" : "testTitle")}</b>
        {!compact && <span className="text-muted-foreground">{t(live ? "liveBody" : "testBody")}</span>}
      </p>
    </div>
  );
}
