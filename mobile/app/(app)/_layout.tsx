import { Redirect, Stack } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "../../src/i18n";
import { useSession } from "../../src/session";
import { colors } from "../../src/ui";

export default function AppLayout() {
  const { status, site } = useSession();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  if (status === "upgrade") return <Redirect href="/upgrade" />;
  if (status === "signed-out") return <Redirect href="/sign-in" />;
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerTintColor: colors.brand, headerTitleStyle: { color: colors.ink }, headerStyle: { backgroundColor: colors.paper }, headerBackButtonDisplayMode: "minimal" }}>
        <Stack.Screen name="index" options={{ title: t("homeTitle") }} />
        <Stack.Screen name="profile" options={{ title: t("profile") }} />
        <Stack.Screen name="setup" options={{ title: t("continueSetup") }} />
        <Stack.Screen name="settings" options={{ title: t("settings") }} />
        <Stack.Screen name="project/[id]" options={{ title: t("project") }} />
      </Stack>
      {/* A test account (staging site): always on screen, so nobody mistakes it for the real Sawwiq. */}
      {site === "staging" ? (
        <View style={{ backgroundColor: colors.gold, paddingTop: 6, paddingBottom: 6 + insets.bottom, paddingHorizontal: 12 }} testID="test-mode">
          <Text style={{ color: colors.ink, fontWeight: "700", textAlign: "center" }}>{t("testMode")}</Text>
        </View>
      ) : null}
    </View>
  );
}
