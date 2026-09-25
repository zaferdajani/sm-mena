import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { demoMode } from "@/lib/demo-mode";
import { DemoToggle } from "./demo-toggle";

/**
 * An honest empty state: no real agencies match yet. Offers the labelled demo
 * (unless it's already on) and a way for agencies to join.
 */
export async function EmptySupply({ text, children }: { text?: string; children?: React.ReactNode }) {
  const t = await getTranslations("Demo");
  const inDemo = await demoMode();
  return (
    <div className="px-4 py-12 text-center" data-testid="empty-supply">
      <p className="font-medium">{text ?? t("emptyReal")}</p>
      {!inDemo && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t("emptyHint")}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {!inDemo && <DemoToggle on label={t("enter")} className={buttonVariants({ variant: "outline", className: "h-9" })} />}
        <Link href="/join" className={buttonVariants({ className: "h-9" })}>
          {t("join")}
        </Link>
      </div>
      {children}
    </div>
  );
}
