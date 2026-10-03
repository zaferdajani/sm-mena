import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LangProvider } from "../src/i18n";
import { SessionProvider } from "../src/session";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LangProvider>
        <SessionProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </SessionProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}
