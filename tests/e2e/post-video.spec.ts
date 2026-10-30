import { expect, test } from "@playwright/test";
import { joinAgency, pngBuffer } from "./helpers";

// A video link on a post (YouTube, TikTok, Instagram, Facebook) plays with the platform's own player.
test("an agency adds a video link to a post; a bad link is refused and the player shows on the post", async ({ page }) => {
  await joinAgency(page, "video");
  await page.goto("/en/studio/new");
  await page.getByTestId("image-input").setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: await pngBuffer("#b45309", 900, 900) });
  await page.fill("#caption", "Morning bake reel for a bakery");
  await page.locator('label:has(input[name="services"])').first().click();
  await page.getByTestId("post-video").fill("https://evil.example/watch?v=dQw4w9WgXcQ");
  await page.getByTestId("publish-button").click();
  await expect(page.getByTestId("post-form").getByRole("alert")).toContainText("video link isn't supported");
  await page.getByTestId("post-video").fill("https://youtu.be/aqz-KE-bpKQ");
  await page.getByTestId("publish-button").click();
  await expect(page).toHaveURL(/\/en\/p\//, { timeout: 30_000 });
  await expect(page.getByTestId("post-embed").locator("iframe")).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ");

  // The editor shows the link back, and clearing it removes the player.
  const postUrl = page.url();
  const id = postUrl.split("/p/")[1];
  await page.goto(`/en/studio/posts/${id}`);
  await expect(page.getByTestId("post-video")).toHaveValue("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
  await page.getByTestId("post-video").fill("");
  await page.getByTestId("publish-button").click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.goto(postUrl);
  await expect(page.getByTestId("post-embed")).toHaveCount(0);
});
