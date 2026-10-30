import * as SecureStore from "expo-secure-store";
import type { TokenStore } from "./api/client";

// The session token lives in the Keychain (iOS) / Keystore (Android), never in AsyncStorage (roadmap §5).
const TOKEN = "sawwiq.session.token";
const EXPIRES = "sawwiq.session.expiresAt";
const LANG = "sawwiq.language";
// Which site the signed-in account lives on: "production" (sawwiq.org) or "staging" (src/api/accounts.ts).
const SITE = "sawwiq.session.site";

export const secureTokenStore: TokenStore = {
  async get() {
    const [token, expiresAt] = await Promise.all([SecureStore.getItemAsync(TOKEN), SecureStore.getItemAsync(EXPIRES)]);
    return token && expiresAt ? { token, expiresAt } : null;
  },
  async set(session) {
    await SecureStore.setItemAsync(TOKEN, session.token);
    await SecureStore.setItemAsync(EXPIRES, session.expiresAt);
  },
  async clear() {
    await SecureStore.deleteItemAsync(TOKEN);
    await SecureStore.deleteItemAsync(EXPIRES);
  },
};

export const languageStore = {
  get: () => SecureStore.getItemAsync(LANG),
  set: (code: string) => SecureStore.setItemAsync(LANG, code),
};

export const siteStore = {
  async get(): Promise<"production" | "staging" | null> {
    const v = await SecureStore.getItemAsync(SITE);
    return v === "production" || v === "staging" ? v : null;
  },
  set: (site: "production" | "staging") => SecureStore.setItemAsync(SITE, site),
  clear: () => SecureStore.deleteItemAsync(SITE),
};
