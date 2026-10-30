import { describe, expect, it } from "vitest";
import { embedFromUrl, embedLink, safeEmbed } from "@/lib/social/embed";

describe("embedFromUrl", () => {
  it("reads the common YouTube link shapes", () => {
    for (const link of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://youtube.com/shorts/dQw4w9WgXcQ", "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=5"]) {
      expect(embedFromUrl(link)).toEqual({ provider: "youtube", itemId: "dQw4w9WgXcQ", url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
    }
  });

  it("reads TikTok, Instagram and Facebook links", () => {
    expect(embedFromUrl("https://www.tiktok.com/@bakery/video/7234567890123456789")?.url).toBe("https://www.tiktok.com/embed/v2/7234567890123456789");
    expect(embedFromUrl("https://www.instagram.com/reel/Cx1AbCdEf/?igsh=1")?.url).toBe("https://www.instagram.com/reel/Cx1AbCdEf/embed/");
    expect(embedFromUrl("https://www.facebook.com/bakery/videos/123456789")?.provider).toBe("facebook");
  });

  it("refuses other hosts, http and look-alikes", () => {
    for (const link of ["http://youtu.be/dQw4w9WgXcQ", "https://evil.com/watch?v=dQw4w9WgXcQ", "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ", "not a link", "https://www.youtube.com/watch?v=<script>", "javascript:alert(1)"]) {
      expect(embedFromUrl(link)).toBeNull();
    }
  });

  it("gives back a link that reads to the same player, and every player passes safeEmbed", () => {
    for (const link of ["https://youtu.be/dQw4w9WgXcQ", "https://www.tiktok.com/@bakery/video/7234567890123456789", "https://www.instagram.com/p/Cx1AbCdEf/", "https://www.facebook.com/bakery/videos/123456789"]) {
      const embed = embedFromUrl(link)!;
      expect(safeEmbed(embed)).toEqual(embed);
      expect(embedFromUrl(embedLink(embed))).toEqual(embed);
    }
  });
});
