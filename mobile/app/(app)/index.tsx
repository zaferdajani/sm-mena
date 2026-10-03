import { useRouter } from "expo-router";
import { useState } from "react";
import { messageFor } from "../../src/errors";
import { useLang } from "../../src/i18n";
import { useSession } from "../../src/session";
import { Body, Button, Card, Notice, Screen, Spinner, Title } from "../../src/ui";

export default function Home() {
  const { t, strings } = useLang();
  const { me, reload } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!me) return <Spinner />;
  const agency = me.agency;
  const setup = me.setup;
  const refresh = async () => {
    setBusy(true);
    setError(null);
    try {
      await reload();
    } catch (e) {
      setError(messageFor(e, t));
    } finally {
      setBusy(false);
    }
  };
  const visibility = agency ? (strings.visibility[agency.visibility as keyof typeof strings.visibility] ?? agency.visibility) : "";
  return (
    <Screen>
      {agency ? (
        <Card>
          <Title>{agency.name}</Title>
          <Body muted>
            @{agency.handle} · {visibility}
          </Body>
          {agency.pendingServices.length ? <Body muted>{t("servicesPending", { n: agency.pendingServices.length })}</Body> : null}
        </Card>
      ) : null}
      <Card>
        {!setup ? <Body>{t("setupNotOpened")}</Body> : setup.status === "finished" ? <Body>{t("setupFinished")}</Body> : <Body>{t("setupStatus", { step: setup.step })}</Body>}
        {setup?.postId ? <Button kind="secondary" title={t("openProject")} onPress={() => router.push({ pathname: "/(app)/project/[id]", params: { id: setup.postId! } })} testID="open-project" /> : null}
        <Button title={setup && setup.status !== "finished" ? t("continueSetup") : t("startSetup")} onPress={() => router.push("/(app)/setup")} testID="continue-setup" />
      </Card>
      <Button kind="secondary" title={t("profile")} onPress={() => router.push("/(app)/profile")} />
      <Button kind="secondary" title={t("settings")} onPress={() => router.push("/(app)/settings")} />
      <Button kind="secondary" title={t("refresh")} onPress={refresh} busy={busy} />
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Screen>
  );
}
