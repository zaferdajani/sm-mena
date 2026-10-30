import type { PostEmbed } from "@/lib/db/schema";
import type { SocialProviderId } from "@/lib/social/types";

// The official players for imported work (docs/53): built from a validated
// provider item id or permalink, never from HTML supplied by anyone. The
// original is always credited with a link to the platform.
const ID = /^[A-Za-z0-9_-]{3,64}$/;

export function embedFor(provider: SocialProviderId, itemId: string, permalink: string): PostEmbed | null {
  if (provider === "youtube" && ID.test(itemId)) return { provider, itemId, url: `https://www.youtube-nocookie.com/embed/${itemId}` };
  if (provider === "tiktok" && /^\d{5,32}$/.test(itemId)) return { provider, itemId, url: `https://www.tiktok.com/embed/v2/${itemId}` };
  if (provider === "instagram") {
    const m = /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]{3,40})\/?/.exec(permalink);
    return m ? { provider, itemId, url: `https://www.instagram.com/${m[2]}/${m[3]}/embed/` } : null;
  }
  if (provider === "facebook" && /^https:\/\/(www\.)?facebook\.com\//.test(permalink)) {
    return { provider, itemId, url: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(permalink)}&show_text=true&width=500` };
  }
  return null;
}

/**
 * A video link an agency pastes on a post (YouTube, TikTok, Instagram or Facebook): the official player for it,
 * or null when the link is not one of those. Only https links on the platforms' own hosts are read.
 */
export function embedFromUrl(raw: string): PostEmbed | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  const parts = url.pathname.split("/").filter(Boolean);
  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    const id = host === "youtu.be" ? parts[0] : parts[0] === "watch" ? url.searchParams.get("v") : ["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : null;
    return id ? embedFor("youtube", id, "") : null;
  }
  if (host === "tiktok.com") {
    const at = parts.indexOf("video");
    const id = at >= 0 ? parts[at + 1] : parts[0] === "embed" ? parts.at(-1) : null;
    return id ? embedFor("tiktok", id, "") : null;
  }
  if (host === "instagram.com" && ["p", "reel", "tv"].includes(parts[0]) && parts[1]) {
    return embedFor("instagram", parts[1], `https://www.instagram.com/${parts[0]}/${parts[1]}/`);
  }
  if (host === "facebook.com" && parts.length) {
    return embedFor("facebook", parts.at(-1) ?? "", `https://www.facebook.com${url.pathname}${url.pathname.startsWith("/watch") ? url.search : ""}`);
  }
  return null;
}

/** The link an agency would paste for an embed (to show it back in the editor). */
export function embedLink(embed: PostEmbed | null | undefined): string {
  if (!embed) return "";
  if (embed.provider === "youtube") return `https://www.youtube.com/watch?v=${embed.itemId}`;
  if (embed.provider === "tiktok") return `https://www.tiktok.com/embed/v2/${embed.itemId}`;
  if (embed.provider === "instagram") return embed.url.replace(/embed\/$/, "");
  const href = /href=([^&]+)/.exec(embed.url)?.[1];
  return href ? decodeURIComponent(href) : "";
}

/** An embed read back from the database is shown only if it still has one of the exact official shapes. */
export function safeEmbed(embed: PostEmbed | null | undefined): PostEmbed | null {
  if (!embed) return null;
  const ok =
    (embed.provider === "youtube" && embed.url === `https://www.youtube-nocookie.com/embed/${embed.itemId}` && ID.test(embed.itemId)) ||
    (embed.provider === "tiktok" && embed.url === `https://www.tiktok.com/embed/v2/${embed.itemId}` && /^\d{5,32}$/.test(embed.itemId)) ||
    (embed.provider === "instagram" && /^https:\/\/www\.instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]{3,40}\/embed\/$/.test(embed.url)) ||
    (embed.provider === "facebook" && embed.url.startsWith("https://www.facebook.com/plugins/post.php?href=https%3A%2F%2F"));
  return ok ? embed : null;
}
