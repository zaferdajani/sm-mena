"use client";

import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";
import { useEffect } from "react";

/**
 * Windows can't draw flag emojis (it shows "JO", "SA"). Where that's the case,
 * load a small self-hosted font with just the flags; other devices keep their own.
 */
export function FlagPolyfill() {
  useEffect(() => {
    polyfillCountryFlagEmojis("Twemoji Country Flags", "/fonts/TwemojiCountryFlags.woff2");
  }, []);
  return null;
}
