import { useState } from "react";
import { API_URL, APP_VERSION } from "../../src/config";
import { messageFor } from "../../src/errors";
import { useLang, type Lang } from "../../src/i18n";
import { useSession } from "../../src/session";
import { Body, Button, Card, Chip, Label, Notice, Row, Screen } from "../../src/ui";

export default function Settings() {
  const { t, lang, setLang } = useLang();
  const { signOut, signOutAll, me } = useSession();
  const [busy, setBusy] = useState<"out" | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pick = (code: Lang) => setLang(code);
  const run = async (which: "out" | "all") => {
    setBusy(which);
    setError(null);
    try {
      await (which === "out" ? signOut() : signOutAll());
    } catch (e) {
      setError(messageFor(e, t));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Screen>
      <Card>
        <Label>{t("language")}</Label>
        <Row>
          <Chip label="العربية" selected={lang === "ar"} onPress={() => pick("ar")} />
          <Chip label="English" selected={lang === "en"} onPress={() => pick("en")} />
        </Row>
        <Body muted>{t("languageNote")}</Body>
      </Card>
      <Card>
        {me?.user.email ? <Body muted>{me.user.email}</Body> : null}
        <Button kind="secondary" title={t("signOut")} onPress={() => run("out")} busy={busy === "out"} testID="sign-out" />
        <Button kind="danger" title={t("signOutAll")} onPress={() => run("all")} busy={busy === "all"} testID="sign-out-all" />
        <Body muted>{t("signOutAllHint")}</Body>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </Card>
      <Body muted>{t("about", { version: APP_VERSION, api: API_URL })}</Body>
    </Screen>
  );
}
