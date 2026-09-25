import { expect, test } from "@playwright/test";
import { ADMIN, joinAgency, login, photoPng } from "./helpers";

// Uploads are compressed in the browser before they are sent (docs/26-media-compression.md).
// On Vercel a request body cannot exceed ~4.5 MB, so these prove the whole path in a real browser.

test("a large camera photo is compressed in the browser and stored small", async ({ page }) => {
  test.setTimeout(120_000);
  await joinAgency(page, "media");
  const photo = await photoPng();
  expect(photo.byteLength).toBeGreaterThan(5_000_000);

  // Record what the page actually sends (Chromium does not report multipart file bodies to Playwright).
  await page.addInitScript(() => {
    const original = window.fetch;
    window.fetch = (input, init) => {
      if (init?.body instanceof FormData) {
        let bytes = 0;
        for (const [, v] of init.body.entries()) bytes += typeof v === "string" ? v.length : v.size;
        (window as unknown as { __sent: number }).__sent = bytes;
      }
      return original(input, init);
    };
  });
  await page.goto("/en/studio/new");
  await page.getByTestId("image-input").setInputFiles({ name: "camera.png", mimeType: "image/png", buffer: photo });
  await page.fill("#caption", "A photo straight from the camera");
  if (!(await page.locator('input[name="services"]:checked').count())) await page.locator('label:has(input[name="services"])').first().click();
  await page.getByTestId("publish-button").click();
  await expect(page).toHaveURL(/\/en\/p\//, { timeout: 60_000 });
  const sent = await page.evaluate(() => (window as unknown as { __sent?: number }).__sent ?? 0);
  expect(sent).toBeGreaterThan(0);
  expect(sent).toBeLessThan(3.8 * 1024 * 1024);

  const src = await page.getByTestId("post-card").locator('img[src*="/media/posts/"]').first().getAttribute("src");
  expect(src).toMatch(/\/media\/posts\/.+\.(webp|jpg|png)$/);
  const stored = await page.request.get(src!);
  expect(stored.ok()).toBe(true);
  const bytes = (await stored.body()).byteLength;
  console.info(`photo: original ${photo.byteLength} B, sent ${sent} B, stored ${bytes} B`);
  expect(bytes).toBeLessThan(250 * 1024);
});

test("a background video is compressed with ffmpeg.wasm and stored as a small MP4", async ({ page, browser, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one engine run is enough; the phone layout is covered by the image tests");
  test.setTimeout(300_000);
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/en/admin/appearance");
  const form = page.getByTestId("background-form");
  await form.getByLabel("Name").fill("Video loop test");
  // The UAE interface, so this never races the Saudi image test running alongside.
  await form.getByLabel("Shown to").selectOption("ae");

  // No ffmpeg binary here: record a short WebM in the page itself and pick it like a person would.
  const recorded = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d")!;
    const recorder = new MediaRecorder(canvas.captureStream(25), { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const stopped = new Promise((resolve) => (recorder.onstop = resolve));
    recorder.start(100);
    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => {
        const t = performance.now() - t0;
        ctx.fillStyle = `hsl(${(t / 10) % 360} 70% 45%)`;
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect((t / 4) % 580, 150, 60, 60);
        ctx.font = "32px sans-serif";
        ctx.fillText("Sawwiq", 40, 60);
        if (t < 2500) requestAnimationFrame(frame);
        else resolve();
      };
      frame();
    });
    recorder.stop();
    await stopped;
    const file = new File(chunks, "loop.webm", { type: "video/webm" });
    const input = document.querySelector<HTMLInputElement>("#bg-file")!;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return file.size;
  });
  expect(recorded).toBeGreaterThan(0);

  await expect(page.getByTestId("background-compress-status")).toBeVisible();
  await expect(page.getByTestId("background-compressed")).toBeVisible({ timeout: 240_000 });
  await expect(page.getByTestId("background-compressed")).toContainText("Compressed:");
  // The CRF search kept the picture the same: SSIM against the scaled source at or above the floor.
  expect(Number(await page.getByTestId("background-compressed").getAttribute("data-ssim"))).toBeGreaterThanOrEqual(0.98);
  const picked = await page.locator("#bg-file").evaluate((el: HTMLInputElement) => ({ name: el.files?.[0]?.name, type: el.files?.[0]?.type, size: el.files?.[0]?.size }));
  expect(picked).toMatchObject({ name: "loop.mp4", type: "video/mp4" });

  await form.getByRole("button", { name: "Save background" }).click();
  await expect(page.getByText("Saved. It shows on the interface right away.")).toBeVisible();

  const host = new URL(baseURL!).hostname;
  const uae = await browser.newContext();
  await uae.addCookies([{ name: "sw_country", value: "ae", domain: host, path: "/" }]);
  const up = await uae.newPage();
  await up.goto("/en/feed");
  const video = up.getByTestId("interface-background").locator("video");
  await expect(video).toHaveAttribute("src", /\/media\/backgrounds\/.+\.mp4$/);
  const stored = await up.request.get((await video.getAttribute("src"))!);
  const body = await stored.body();
  expect(body.byteLength).toBeLessThan(4 * 1024 * 1024);
  expect(body.subarray(4, 8).toString("latin1")).toBe("ftyp");
  const done = page.getByTestId("background-compressed");
  console.info(`video: recorded ${recorded} B, stored ${body.byteLength} B, crf ${await done.getAttribute("data-crf")}, ssim ${await done.getAttribute("data-ssim")}`);
  await uae.close();

  await page.getByTestId("background-list").locator("li", { hasText: "Video loop test" }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId("background-list")).not.toContainText("Video loop test");
});
