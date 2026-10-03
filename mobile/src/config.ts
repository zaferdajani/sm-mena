import Constants from "expo-constants";
import { Platform } from "react-native";

// Where /api/v1 lives. A staging deployment with API_V1_ENABLED=true; production answers 404 until the
// mobile beta (docs/architecture/mobile-and-api-roadmap.md §8.1). Set EXPO_PUBLIC_API_URL when starting Expo.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3100").replace(/\/$/, "");
export const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";
export const APP_PLATFORM = Platform.OS;
