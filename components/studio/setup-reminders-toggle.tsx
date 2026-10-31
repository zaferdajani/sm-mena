import { getTranslations } from "next-intl/server";
import { setSetupRemindersAction } from "@/app/[locale]/(main)/studio/strength-actions";

/** Studio → Account: the setup-reminder emails, on or off (docs/65 stage 4). */
export async function SetupRemindersToggle({ optIn }: { optIn: boolean }) {
  const t = await getTranslations("SetupReminders");
  return (
    <form action={setSetupRemindersAction} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm" data-testid="setup-reminders" data-state={optIn ? "on" : "off"}>
      <span>
        <span className="block font-semibold">{t("title")}</span>
        <span className="text-muted-foreground">{optIn ? t("on") : t("off")}</span>
      </span>
      <button type="submit" name="optIn" value={optIn ? "off" : "on"} className="min-h-11 rounded-lg border px-4 font-semibold" data-testid="setup-reminders-toggle">{optIn ? t("turnOff") : t("turnOn")}</button>
    </form>
  );
}
