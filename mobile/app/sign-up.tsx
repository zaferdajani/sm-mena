import * as Linking from "expo-linking";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ApiFailure } from "../src/api/client";
import type { SignupOptions } from "../src/api/contract";
import { SERVERS } from "../src/config";
import { messageFor } from "../src/errors";
import { useLang } from "../src/i18n";
import { useSession } from "../src/session";
import { Body, Button, Card, Chip, Field, Label, Notice, Row, Screen, Spinner, Title } from "../src/ui";

// Creating an account in the app always makes a real Sawwiq account (docs/64, "One app, two sites"): the same
// fields, rules, consent and age confirmation as sawwiq.org/join (lib/data/provider-signup.ts). Test accounts
// are made on the staging website instead.
export default function SignUp() {
  const { t, lang } = useLang();
  const router = useRouter();
  const { status, signUp, production } = useSession();
  const [options, setOptions] = useState<SignupOptions | null>(null);
  const [closed, setClosed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [kind, setKind] = useState<"agency" | "freelancer">("agency");
  const [country, setCountry] = useState("jo");
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    production.auth
      .signupOptions()
      .then(setOptions)
      .catch((e) => {
        // The real site answers 404 until its app switch is on: say so, and offer the website.
        if (e instanceof ApiFailure && e.status === 404) setClosed(true);
        else setLoadError(messageFor(e, t));
      });
  }, [production, t]);

  if (status === "signed-in") return <Redirect href="/(app)" />;
  if (status === "upgrade") return <Redirect href="/upgrade" />;

  const place = options?.countries.find((c) => c.code === country) ?? options?.countries[0];
  const label = (item: { ar: string; en: string }) => (lang === "ar" ? item.ar : item.en);
  const ready = name.trim().length >= 2 && handle.trim() && city && whatsapp.trim().length >= 7 && email.trim() && password.length >= 8 && consent && adult;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signUp({
        name: name.trim(),
        handle: handle.trim().toLowerCase(),
        kind,
        city,
        whatsapp: whatsapp.trim(),
        whatsappCountry: (place?.code ?? "jo").toUpperCase(),
        email: email.trim(),
        password,
        consent: true,
        adult: true,
      });
    } catch (e) {
      setError(e instanceof ApiFailure && e.status === 404 ? t("signUpClosed") : messageFor(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>{t("signUpTitle")}</Title>
      <Body muted>{t("signUpHint")}</Body>
      {closed ? (
        <Card>
          <Notice>{t("signUpClosed")}</Notice>
          <Button kind="secondary" title={t("signUpOnWeb")} onPress={() => Linking.openURL(`${SERVERS.production}/${lang}/join`)} testID="sign-up-web" />
        </Card>
      ) : loadError ? (
        <Notice tone="error">{loadError}</Notice>
      ) : !options ? (
        <Spinner />
      ) : (
        <>
          <Field label={t("signUpName")} value={name} onChangeText={setName} autoComplete="organization" testID="signup-name" />
          <Field label={t("signUpHandle")} value={handle} onChangeText={setHandle} autoCapitalize="none" autoCorrect={false} testID="signup-handle" />
          <Body muted>{t("signUpHandleHint", { handle: handle.trim().toLowerCase() || "your.agency" })}</Body>
          <Label>{t("signUpKind")}</Label>
          <Row>
            <Chip label={t("signUpAgency")} selected={kind === "agency"} onPress={() => setKind("agency")} />
            <Chip label={t("signUpFreelancer")} selected={kind === "freelancer"} onPress={() => setKind("freelancer")} />
          </Row>
          <Label>{t("signUpCountry")}</Label>
          <Row>
            {options.countries.map((c) => (
              <Chip key={c.code} label={`${c.flag} ${label(c)}`} selected={place?.code === c.code} onPress={() => { setCountry(c.code); setCity(""); }} />
            ))}
          </Row>
          <Label>{t("signUpCity")}</Label>
          <Row>
            {(place?.cities ?? []).map((c) => (
              <Chip key={c.key} label={label(c)} selected={city === c.key} onPress={() => setCity(c.key)} />
            ))}
          </Row>
          <Field label={t("signUpWhatsapp", { dial: place?.dial ?? "962" })} value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" textContentType="telephoneNumber" testID="signup-whatsapp" />
          <Field label={t("email")} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" testID="signup-email" />
          <Field label={t("password")} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" testID="signup-password" />
          <Body muted>{t("signUpPasswordHint")}</Body>
          <Card>
            <Chip label={t("signUpConsent")} selected={consent} onPress={() => setConsent(!consent)} />
            <Button kind="secondary" title={t("signUpTerms")} onPress={() => Linking.openURL(`${SERVERS.production}/${lang}/legal`)} testID="signup-terms" />
            <Chip label={t("signUpAdult")} selected={adult} onPress={() => setAdult(!adult)} />
          </Card>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button title={busy ? t("signUpBusy") : t("signUpButton")} onPress={submit} busy={busy} disabled={!ready} testID="sign-up" />
        </>
      )}
      <Button kind="secondary" title={t("haveAccount")} onPress={() => router.replace("/sign-in")} testID="to-sign-in" />
    </Screen>
  );
}
