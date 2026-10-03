import { Redirect, Stack } from "expo-router";
import { useLang } from "../../src/i18n";
import { useSession } from "../../src/session";
import { colors } from "../../src/ui";

export default function AppLayout() {
  const { status } = useSession();
  const { t } = useLang();
  if (status === "upgrade") return <Redirect href="/upgrade" />;
  if (status === "signed-out") return <Redirect href="/sign-in" />;
  return (
    <Stack screenOptions={{ headerTintColor: colors.brand, headerTitleStyle: { color: colors.ink }, headerStyle: { backgroundColor: colors.paper }, headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="index" options={{ title: t("homeTitle") }} />
      <Stack.Screen name="profile" options={{ title: t("profile") }} />
      <Stack.Screen name="setup" options={{ title: t("continueSetup") }} />
      <Stack.Screen name="settings" options={{ title: t("settings") }} />
      <Stack.Screen name="project/[id]" options={{ title: t("project") }} />
    </Stack>
  );
}
