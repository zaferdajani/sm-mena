import { useEffect, useState } from "react";
import catalog from "../../src/catalog/services.json";
import { messageFor } from "../../src/errors";
import { nameIn, useLang } from "../../src/i18n";
import { useSession } from "../../src/session";
import { Body, Button, Chip, Field, Label, Notice, Row, Screen, Spinner } from "../../src/ui";

// Step 1 of the setup on its own screen: name, bio and services, saved against the draft version.
export default function Profile() {
  const { t, lang } = useLang();
  const { me, client, reload } = useSession();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  useEffect(() => {
    if (!me?.agency) return;
    setName(me.agency.name);
    setBio(me.agency.bio ?? "");
    setServices(me.agency.services);
  }, [me]);
  if (!me?.agency) return <Spinner />;
  const toggle = (key: string) => setServices((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  const save = async () => {
    setBusy(true);
    setNote(null);
    try {
      let version = me.setup?.version;
      if (version === undefined) version = (await client.setup.open()).setup.version;
      await client.setup.patchProfile({ version, name: name.trim(), bio: bio.trim(), services });
      await reload();
      setNote({ tone: "success", text: t("saved") });
    } catch (e) {
      await reload().catch(() => undefined);
      setNote({ tone: "error", text: messageFor(e, t) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Body muted>{t("step1Body")}</Body>
      <Field label={t("name")} value={name} onChangeText={setName} maxLength={80} testID="name" />
      <Field label={t("bio")} value={bio} onChangeText={setBio} multiline maxLength={500} testID="bio" />
      <Label>{t("services")}</Label>
      {catalog.categories.map((c) => (
        <Row key={c.key}>
          {c.services.map((s) => (
            <Chip key={s.key} label={nameIn(lang, s)} selected={services.includes(s.key)} onPress={() => toggle(s.key)} />
          ))}
        </Row>
      ))}
      {note ? <Notice tone={note.tone}>{note.text}</Notice> : null}
      <Button title={t("save")} onPress={save} busy={busy} disabled={name.trim().length < 2 || !services.length} testID="save-profile" />
    </Screen>
  );
}
