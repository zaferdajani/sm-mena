import { AsyncLocalStorage } from "node:async_hooks";

// The country an AI matchmaker turn searches in (the visitor's country), set
// once per request so every tool call and fallback stays in it without
// threading it through each provider.
// includeDemo: the visitor chose the demo view (lib/demo-mode.ts); otherwise
// only real agencies are ever recommended.
const store = new AsyncLocalStorage<{ country: string; includeDemo?: boolean }>();

export const withCountry = <T>(country: string, fn: () => Promise<T>, includeDemo = false) => store.run({ country, includeDemo }, fn);
export const scopedCountry = () => store.getStore()?.country;
export const scopedIncludeDemo = () => store.getStore()?.includeDemo ?? false;
