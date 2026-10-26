import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers";

const fixture = (name: string) => readFileSync(path.join(process.cwd(), "tests/fixtures", name));

// docs/61: a report can be a voice note and a screen recording alone; staff can play both, nobody else can fetch them.
test("a voice note and a screen recording reach Admin → Bugs, private and playable", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "mobile", "the phone run covers the form");
  const marker = `media-${Date.now()}`;
  await page.goto(`/ar/support?from=/ar/${marker}`);
  await page.getByTestId("voice-file").setInputFiles({ name: "note.webm", mimeType: "audio/webm", buffer: fixture("voice-note-ar.webm") });
  await expect(page.getByTestId("voice-note").locator("audio")).toHaveCount(1);
  await page.getByTestId("video-file").setInputFiles({ name: "screen.mp4", mimeType: "video/mp4", buffer: fixture("screen-recording.mp4") });
  await expect(page.getByTestId("video-field").locator("video")).toHaveCount(1);
  // No text needed when a voice note says it.
  await page.getByTestId("support-form").getByRole("button", { name: "إرسال" }).click();
  await expect(page.getByTestId("support-sent")).toBeVisible();
  const ref = (await page.getByTestId("support-ref").textContent())!.trim();

  const admin = await browser.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/en/admin/bugs?tab=reports");
  const row = admin.getByTestId("report-list").locator("li", { has: admin.getByTestId("report-ref").filter({ hasText: ref }) });
  await expect(row).toContainText(marker);
  const audio = (await row.getByTestId("report-audio").getAttribute("src"))!;
  const video = (await row.getByTestId("report-video").getAttribute("src"))!;
  expect(audio).toMatch(/\.webm$/);
  expect(video).toMatch(/\.mp4$/);
  const ranged = await admin.request.get(video, { headers: { range: "bytes=0-99" } });
  expect(ranged.status()).toBe(206);
  expect(ranged.headers()["content-type"]).toBe("video/mp4");
  expect((await admin.request.get(audio)).headers()["content-type"]).toBe("audio/webm");

  const visitor = await browser.newContext();
  expect((await visitor.request.get(audio)).status()).toBe(404);
  await visitor.close();
});

test("a file that only claims to be audio is refused", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "one run is enough");
  await page.goto("/ar/support");
  await page.fill("#message", "تجربة ملف غير صوتي");
  await page.getByTestId("voice-file").setInputFiles({ name: "fake.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("this is not audio at all, just text pretending") });
  await page.getByTestId("support-form").getByRole("button", { name: "إرسال" }).click();
  await expect(page.getByTestId("support-form")).toContainText("تعذّر قراءة الملف الصوتي أو التسجيل");
});
