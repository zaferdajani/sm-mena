import { Award } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { FOUNDING, type FoundingStatus } from "@/lib/founding";

/**
 * The Founding 100 (docs/39): what the provider is (in the cohort or not), what
 * they get, and until when. Benefits are named plainly and bounded; the seat
 * number itself is shown by the seat card.
 */
export async function FoundingPanel({ status }: { status: FoundingStatus }) {
  const t = await getTranslations("Founding");
  const format = await getFormatter();
  const benefits = ["profile", "badge", "premium", "intros", "exposure", "advisory"] as const;
  return (
    <section className="rounded-xl border p-4" data-testid="founding-panel" data-member={status.member}>
      <h2 className="flex items-center gap-2 font-semibold">
        <Award className="size-5 text-amber-600" />
        {status.member ? t("memberTitle", { year: FOUNDING.year }) : t("notMemberTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {status.member
          ? status.benefitsUntil
            ? t("memberUntil", { date: format.dateTime(status.benefitsUntil, { dateStyle: "long" }) })
            : t("memberPending", { days: FOUNDING.benefitDays })
          : status.open
            ? t("stillOpen", { left: status.seatsLeft })
            : t("closed", { size: FOUNDING.size })}
      </p>
      <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
        {benefits.map((b) => (
          <li key={b} className="rounded-lg border px-3 py-2">
            <span className="font-medium">{t(`benefits.${b}.what`)}</span>
            <span className="block text-xs text-muted-foreground">{t(`benefits.${b}.limit`)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">{t("notRank")}</p>
    </section>
  );
}
