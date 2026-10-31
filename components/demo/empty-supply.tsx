import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { demoMode } from "@/lib/demo-mode";
import { DemoToggle } from "./demo-toggle";
import { canUse } from "@/lib/feature-gate";

/**
 * An honest empty state: no real agencies match yet. Offers the labelled demo
 * (unless it's already on) and a way for agencies to join.
 */
export async function EmptySupply({ text, children }: { text?: string; children?: React.ReactNode }) {
  const t = await getTranslations("Demo");
  const inDemo = await demoMode();
  const demoOpen = await canUse("demo_view");
  return (
    <div className="px-4 py-12 text-center" data-testid="empty-supply">
      <p className="font-medium">{text ?? t("emptyReal")}</p>
      {!inDemo && demoOpen && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t("emptyHint")}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {!inDemo && demoOpen && <DemoToggle on label={t("enter")} className={buttonVariants({ variant: "outline", className: "h-9" })} />}
        <Link href="/join" className={buttonVariants({ className: "h-9" })}>
          {t("join")}
        </Link>
      </div>
      {children}
    </div>
  );
}

/**
 * The labelled demo, offered beside real results that are few or only close, not only on an empty page:
 * a landing card used to lead to a near-empty list with no hint that sample agencies exist to try.
 */
export async function DemoOffer({ text }: { text?: string }) {
  const t = await getTranslations("Demo");
  if ((await demoMode()) || !(await canUse("demo_view"))) return null;
  return (
    <div className="mx-auto mt-4 flex max-w-xl flex-wrap items-center justify-center gap-3 rounded-xl border border-dashed bg-card px-4 py-3 text-center text-sm" data-testid="demo-offer">
      <p className="text-muted-foreground">{text ?? t("fewHint")}</p>
      <DemoToggle on label={t("enter")} className={buttonVariants({ variant: "outline", className: "h-9" })} />
    </div>
  );
}
