import { Redirect } from "expo-router";
import { useState } from "react";
import { messageFor } from "../src/errors";
import { useLang } from "../src/i18n";
import { useSession } from "../src/session";
import { Body, Button, Field, Notice, Screen, Title } from "../src/ui";

export default function SignIn() {
  const { t } = useLang();
  const { status, signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (status === "signed-in") return <Redirect href="/(app)" />;
  if (status === "upgrade") return <Redirect href="/upgrade" />;
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(messageFor(e, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Title>{t("appName")}</Title>
      <Body muted>{t("signInHint")}</Body>
      <Field label={t("email")} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" testID="email" />
      <Field label={t("password")} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" testID="password" />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button title={busy ? t("signingIn") : t("signIn")} onPress={submit} busy={busy} disabled={!email || !password} testID="sign-in" />
    </Screen>
  );
}
