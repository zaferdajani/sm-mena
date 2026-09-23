"use client";

import { createBrowserClient } from "@supabase/ssr";

// Supabase client for Client Components. Only the public URL and anon key
// are exposed to the browser.
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. See .env.example.",
    );
  }
  return createBrowserClient(url, anonKey);
}
