import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import type { ProjectAnswer } from "../../../src/api/contract";
import { messageFor } from "../../../src/errors";
import { useLang } from "../../../src/i18n";
import { PrivateImage } from "../../../src/private-image";
import { useSession } from "../../../src/session";
import { Body, Notice, Screen, Spinner, Title } from "../../../src/ui";

// The saved project as its owner sees it; images come through /api/portfolio-media with the bearer token,
// so a private page's work never renders for anyone else (the server answers 404, not 403).
export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLang();
  const { client } = useSession();
  const [answer, setAnswer] = useState<ProjectAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    client.projects
      .get(id)
      .then(setAnswer)
      .catch((e) => setError(messageFor(e, t)));
  }, [id, client, t]);
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!answer) return <Spinner />;
  const { project, owner } = answer;
  return (
    <Screen>
      <Title>{project.caption.split("\n")[0]}</Title>
      {owner ? <Body muted>{t("owner")}</Body> : null}
      <View style={{ gap: 10 }}>
        {project.images.map((img) => (
          <PrivateImage key={img.url} path={img.url} ratio={img.width && img.height ? img.width / img.height : 4 / 3} />
        ))}
      </View>
      <Body>{project.caption}</Body>
    </Screen>
  );
}
