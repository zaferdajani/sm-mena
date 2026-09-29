import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";

/** The server uses BEHANCE_FIXTURES. Its synthetic CDN URLs must resolve to
 * the same checked-in bytes in the browser, not a real site's missing images.
 * These exact fixtures are local test data, never evidence of live API access.
 */
export async function serveBehanceFixtureMedia(page: Page) {
  const fixtures = [
    ["https://mir-s3-cdn-cf.behance.net/project_modules/source/boutique-1.webp", "boutique-1.webp"],
    ["https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/boutique-2.webp", "boutique-2.webp"],
    ["https://mir-s3-cdn-cf.behance.net/projects/404/boutique-cover.webp", "boutique-cover.webp"],
    ["https://mir-s3-cdn-cf.behance.net/projects/404/hotel-cover.webp", "hotel-cover.webp"],
  ] as const;
  for (const [url, file] of fixtures) {
    const body = await readFile(path.join("tests/fixtures/behance/images", file));
    await page.route(url, (route) => route.fulfill({ status: 200, contentType: "image/webp", body }));
  }
}

/** Do not accept an empty grey rectangle or broken-image icon as a preview. */
export async function expectDecodedPreview(card: Locator, expected: number) {
  const images = card.locator("img");
  await expect(images).toHaveCount(expected);
  await expect.poll(() => images.evaluateAll((elements) => elements.every((element) => {
    const image = element as HTMLImageElement;
    return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  })), { message: "Every preview image must have decoded real fixture/upload bytes" }).toBe(true);
}
