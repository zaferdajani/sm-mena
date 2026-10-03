import { useLang } from "../src/i18n";
import { useSession } from "../src/session";
import { Body, Screen, Title } from "../src/ui";

// 426 upgrade_required: the server no longer serves this version; nothing else is offered.
export default function Upgrade() {
  const { t } = useLang();
  const { minVersion } = useSession();
  return (
    <Screen>
      <Title>{t("upgradeTitle")}</Title>
      <Body>{t("upgradeBody", { min: minVersion ?? "—" })}</Body>
    </Screen>
  );
}
