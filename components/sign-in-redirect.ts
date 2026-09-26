"use client";

import { useRouter } from "@/i18n/navigation";

/** Follow, like and save need an account (docs/41): go to sign-in, then come back here. */
export function useGoToSignIn() {
  const router = useRouter();
  return () => router.push({ pathname: "/signin", query: { next: window.location.pathname + window.location.search } });
}
