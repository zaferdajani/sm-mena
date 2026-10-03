import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { MAX_IMAGES_PER_POST, missingForPublish, type Setup } from "../../src/api/contract";
import catalog from "../../src/catalog/services.json";
import { messageFor } from "../../src/errors";
import { nameIn, useLang } from "../../src/i18n";
import { PrivateImage } from "../../src/private-image";
import { useSession } from "../../src/session";
import { Body, Button, Card, Chip, Field, Label, Notice, Row, Screen, Spinner, Title } from "../../src/ui";

// The first-run setup as the server keeps it: step, version and media come from GET /me, every save names the
// version it read, and a stale answer reloads the draft instead of guessing (roadmap §8 items 4–8).
export default function SetupScreen() {
  const { t, lang } = useLang();
  const { me, client, reload } = useSession();
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(me?.setup ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [contribution, setContribution] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [rights, setRights] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);

  useEffect(() => {
    if (setup) return;
    client.setup
      .open()
      .then((r) => setSetup(r.setup))
      .catch((e) => setError(messageFor(e, t)));
  }, [setup, client, t]);
  useEffect(() => {
    const p = setup?.data.project;
    if (p) {
      setTitle(p.title);
      setContribution(p.contribution);
      setServices(p.services);
    } else if (me?.agency?.services.length && !services.length) setServices(me.agency.services);
    // the project's own services win; the agency's are only a starting point
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup?.data.project, me?.agency]);

  if (!setup) return error ? <Notice tone="error">{error}</Notice> : <Spinner />;

  const run = async (work: () => Promise<{ setup: Setup }>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await work();
      setSetup(r.setup);
    } catch (e) {
      // A stale version means another device moved the draft: show the server's copy.
      const fresh = await client.setup.me().catch(() => null);
      if (fresh?.setup) setSetup(fresh.setup);
      setError(messageFor(e, t));
    } finally {
      setBusy(false);
    }
  };
  const goStep = (step: number) => run(() => client.setup.step(setup.version, step));
  const pickImages = async () => {
    const room = MAX_IMAGES_PER_POST - setup.media.length;
    if (room <= 0) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: room, quality: 0.9 });
    if (picked.canceled || !picked.assets.length) return;
    await run(() => client.setup.upload(picked.assets.map((a, i) => ({ uri: a.uri, name: a.fileName ?? `image-${i + 1}.jpg`, type: a.mimeType ?? "image/jpeg" }))));
  };
  const publish = () =>
    run(async () => {
      const r = await client.setup.publish(setup.version, rights);
      setPostId(r.postId);
      await reload().catch(() => undefined);
      return r;
    });

  if (postId || setup.status === "finished") {
    const id = postId ?? setup.postId;
    return (
      <Screen>
        <Title>{t("step5Title")}</Title>
        <Notice tone="success">{t("published")}</Notice>
        {id ? <Button title={t("openProject")} onPress={() => router.replace({ pathname: "/(app)/project/[id]", params: { id } })} testID="open-project" /> : null}
      </Screen>
    );
  }

  const blocker = missingForPublish(setup);
  const blockerText = blocker === "noProject" ? t("blockerNoProject") : blocker === "noServices" ? t("blockerNoServices") : blocker === "noMedia" ? t("blockerNoMedia") : null;
  const step = setup.step;

  return (
    <Screen>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {step <= 1 ? (
        <Card>
          <Title>{t("step1Title")}</Title>
          <Body muted>{t("step1Body")}</Body>
          <Button kind="secondary" title={t("profile")} onPress={() => router.push("/(app)/profile")} />
          <Button title={t("next")} onPress={() => goStep(2)} busy={busy} disabled={!me?.agency?.services.length} testID="step-1-next" />
        </Card>
      ) : null}
      {step === 2 ? (
        <Card>
          <Title>{t("step2Title")}</Title>
          <Body muted>{t("step2Body")}</Body>
          <Button title={t("sourceUpload")} onPress={() => run(() => client.setup.source(setup.version, "upload"))} busy={busy} testID="source-upload" />
          <Button kind="secondary" title={t("back")} onPress={() => goStep(1)} disabled={busy} />
        </Card>
      ) : null}
      {step === 3 ? (
        <Card>
          <Title>{t("step3Title")}</Title>
          <Button title={t("clientPersonal")} onPress={() => run(() => client.setup.client(setup.version, { mode: "personal" }))} busy={busy} testID="client-personal" />
          <Button kind="secondary" title={t("clientPrivate")} onPress={() => run(() => client.setup.client(setup.version, { mode: "private" }))} disabled={busy} />
          <Button kind="secondary" title={t("back")} onPress={() => goStep(2)} disabled={busy} />
        </Card>
      ) : null}
      {step === 4 ? (
        <Card>
          <Title>{t("step4Title")}</Title>
          <Field label={t("projectTitle")} value={title} onChangeText={setTitle} maxLength={120} testID="project-title" />
          <Field label={t("contribution")} value={contribution} onChangeText={setContribution} multiline maxLength={1000} testID="project-contribution" />
          <Label>{t("services")}</Label>
          {catalog.categories.map((c) => (
            <Row key={c.key}>
              {c.services.map((s) => (
                <Chip key={s.key} label={nameIn(lang, s)} selected={services.includes(s.key)} onPress={() => setServices((v) => (v.includes(s.key) ? v.filter((k) => k !== s.key) : [...v, s.key]))} />
              ))}
            </Row>
          ))}
          <Label>{t("images")}</Label>
          <Body muted>{t("maxImages", { n: MAX_IMAGES_PER_POST })}</Body>
          <View style={{ gap: 10 }}>
            {setup.media.map((m) => (
              <View key={m.id} style={{ gap: 6 }}>
                <PrivateImage path={m.url} ratio={m.width && m.height ? m.width / m.height : 4 / 3} />
                <Pressable accessibilityRole="button" onPress={() => run(() => client.setup.removeMedia(m.id))} disabled={busy}>
                  <Body muted>{t("remove")}</Body>
                </Pressable>
              </View>
            ))}
          </View>
          <Button kind="secondary" title={busy ? t("uploading") : t("pickImages")} onPress={pickImages} busy={busy} disabled={setup.media.length >= MAX_IMAGES_PER_POST} testID="pick-images" />
          <Button title={t("next")} onPress={() => run(() => client.setup.project(setup.version, { title: title.trim(), contribution: contribution.trim(), services }))} busy={busy} disabled={title.trim().length < 2 || contribution.trim().length < 2 || !services.length} testID="project-next" />
          <Button kind="secondary" title={t("back")} onPress={() => goStep(3)} disabled={busy} />
        </Card>
      ) : null}
      {step >= 5 ? (
        <Card>
          <Title>{t("step5Title")}</Title>
          <Body>{setup.data.project?.title}</Body>
          <Body muted>{setup.data.project?.contribution}</Body>
          <Row>{(setup.data.project?.services ?? []).map((k) => <Chip key={k} label={serviceName(lang, k)} selected onPress={() => undefined} />)}</Row>
          <View style={{ gap: 10 }}>
            {setup.media.map((m) => (
              <PrivateImage key={m.id} path={m.url} ratio={m.width && m.height ? m.width / m.height : 4 / 3} />
            ))}
          </View>
          {blockerText ? <Notice tone="error">{blockerText}</Notice> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Switch value={rights} onValueChange={setRights} testID="rights" />
            <Body>{t("rights")}</Body>
          </View>
          <Button title={busy ? t("publishing") : t("publish")} onPress={publish} busy={busy} disabled={!rights || Boolean(blocker)} testID="publish" />
          <Button kind="secondary" title={t("back")} onPress={() => goStep(4)} disabled={busy} />
        </Card>
      ) : null}
    </Screen>
  );
}

function serviceName(lang: "ar" | "en", key: string): string {
  for (const c of catalog.categories) for (const s of c.services) if (s.key === key) return nameIn(lang, s);
  return key;
}
