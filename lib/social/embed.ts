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
