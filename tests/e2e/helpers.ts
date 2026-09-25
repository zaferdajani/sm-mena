import type { Locator, Page } from "@playwright/test";

export const DEMO_AGENCY = { email: "nakhla-studio@sawwiq.test", password: "demo-pass-123", handle: "nakhla.studio" };
export const ADMIN = { email: "admin@sawwiq.test", password: "admin-pass-123" };

export async function login(page: Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}

export function uniqueHandle(prefix = "e2e") {
  return `${prefix}.${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

/** A small valid PNG of the given colour, built without extra dependencies. */
export async function pngBuffer(color: string, width = 800, height = 800) {
  const sharp = (await import("sharp")).default;
  return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
}

/** Creates a fresh agency account and leaves the page signed in on its studio. */
export async function joinAgency(page: Page, prefix = "e2e") {
  const handle = uniqueHandle(prefix);
  const email = `${handle}@test.jo`;
  const password = "password-123";
  await page.goto("/en/join");
  await page.fill("#name", `Agency ${handle}`);
  await page.fill("#handle", handle);
  await page.fill("#whatsapp", "0791112233");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Create page" }).click();
  await page.waitForURL(/\/en\/studio\/profile/);
  return { handle, email, password };
}

/** Draws a short squiggle on the (first visible) signature pad inside `scope`. */
export async function drawSignature(page: Page, scope: Locator | Page = page) {
  const canvas = scope.getByTestId("signature-pad").locator("canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.2, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.width * (0.2 + i * 0.07), y + (i % 2 ? -12 : 12), { steps: 2 });
  await page.mouse.up();
}

/**
 * A camera-sized photo as a PNG (a real demo photo scaled up to 4000×3000),
 * tens of MB: far over what a serverless request may carry, so it only gets
 * through if the browser compresses it first.
 */
export async function photoPng(width = 4000, height = 3000) {
  const sharp = (await import("sharp")).default;
  const { readFile } = await import("node:fs/promises");
  const photo = await readFile("data/demo-portfolio/abha.trails-1.webp");
  return sharp(photo).resize(width, height, { fit: "cover" }).png().toBuffer();
}
