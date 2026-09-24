import { AsyncLocalStorage } from "node:async_hooks";

// The country an AI matchmaker turn searches in (the visitor's country), set
// once per request so every tool call and fallback stays in it without
// threading it through each provider.
const store = new AsyncLocalStorage<{ country: string }>();

export const withCountry = <T>(country: string, fn: () => Promise<T>) => store.run({ country }, fn);
export const scopedCountry = () => store.getStore()?.country;
