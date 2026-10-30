import Constants from "expo-constants";
import { Platform } from "react-native";

// The two sites one app talks to (docs/64-native-beta.md, "One app, two sites"). Sign-in tries the real site first
// and the staging site only when the real site does not know the account; sign-up always creates a real account.
// Production answers 404 on /api/v1 until its API switch is turned on. Builds set both with EXPO_PUBLIC_*;
// EXPO_PUBLIC_API_URL is the older name for the staging address.
export type ServerName = "production" | "staging";
const clean = (url: string) => url.replace(/\/$/, "");
export const SERVERS: Record<ServerName, string> = {
  production: clean(process.env.EXPO_PUBLIC_PRODUCTION_URL ?? "https://sawwiq.org"),
  staging: clean(process.env.EXPO_PUBLIC_STAGING_URL ?? process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3100"),
};
export const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";
export const APP_PLATFORM = Platform.OS;
