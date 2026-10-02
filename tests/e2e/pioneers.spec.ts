import { expect, test } from "@playwright/test";
import { ADMIN, login, uniqueHandle } from "./helpers";

// The First Wave seal (docs/57): the admin creates a letter, its page shows the reserved
// number, the invitee claims it at sign-up, and the seal appears once the page has a project.
test("a letter's QR page leads to a numbered seal on the new page", async ({ browser }, info) => {
  test.skip(info.project.name === "mobile", "one run is enough; the invite page is checked on a phone below");
  const admin = await (await browser.newContext()).newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/en/admin/prospects");
  const name = `Wave Studio ${Date.now().toString(36)}`;
  const form = admin.getByTestId("prospect-add");
  await form.locator("#pr-name").fill(name);
  await form.getByRole("button", { name: "Add to the list" }).click();
  const row = admin.getByTestId("prospect-row").filter({ hasText: name });
  await row.getByTestId("prospect-invite").click();
  const invitation = row.getByTestId("prospect-invitation");
  await expect(invitation).toHaveAttribute("data-state", "open");
  await expect(invitation.getByTestId("invitation-watched")).toHaveAttribute("data-watched", "false");
  // Letters carry no number: medals are numbered in claim order.
  await expect(invitation.getByTestId("invitation-number")).toHaveCount(0);
  const link = (await invitation.getByTestId("invitation-link").textContent())!.trim();
  const code = link.split("/i/")[1];
  expect(code).toMatch(/^[a-hj-km-np-z2-9]{8}$/);

  // The printable letter: Arabic front, English back, one QR each.
  await admin.goto(`/en/pioneer-letters?code=${code}`);
  await expect(admin.getByTestId("pioneer-letter")).toHaveCount(2);
  await expect(admin.getByTestId("pioneer-letter").first()).toHaveAttribute("data-locale", "ar");
  await expect(admin.getByTestId("pioneer-letter").first().locator(".pioneer-letter__qr svg")).toBeVisible();
  await expect(admin.getByTestId("pioneer-letter").last()).toContainText("Only 50 medals");

  // The invitee scans the code on a phone.
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await phone.goto(`/ar/i/${code}`);
  await expect(phone.getByTestId("pioneer-invite")).toHaveAttribute("data-state", "open");
  await expect(phone.getByTestId("pioneer-medals-left")).toContainText("من ٥٠ وسام");
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // Without a deployed video the claim opens at once; with one it waits for the end of the video.
  const hasVideo = await phone.getByTestId("pioneer-video").count();
  if (hasVideo) {
    await expect(phone.getByTestId("pioneer-claim")).toHaveAttribute("aria-disabled", "true");
    await phone.evaluate(() => { const v = document.querySelector("video")!; v.currentTime = v.duration || 1; v.dispatchEvent(new Event("ended")); });
  }
  await expect(phone.getByTestId("pioneer-watch-state")).toHaveAttribute("data-watched", "true");
  await phone.getByTestId("pioneer-claim").click();
  await expect(phone).toHaveURL(/\/join$/);
  const handle = uniqueHandle("wave");
  await phone.fill("#name", name);
  await phone.fill("#handle", handle);
  await phone.fill("#whatsapp", "0791112233");
  await phone.fill("#email", `${handle}@test.jo`);
  await phone.fill("#password", "password-123");
  await phone.check('input[name="consent"]');
  await phone.getByRole("button", { name: /Create page|إنشاء/ }).click();
  await phone.waitForURL(/\/portfolio-setup/);

  // Claimed, and the letter page now says so; the seal waits for the first project.
  await phone.goto(`/ar/i/${code}`);
  await expect(phone.getByTestId("pioneer-invite")).toHaveAttribute("data-state", "claimed");
  await expect(phone.getByTestId("pioneer-claimed-page")).toBeVisible();
  await phone.goto(`/ar/a/${handle}`);
  await expect(phone.getByTestId("pioneer-badge")).toHaveCount(0);

  await admin.goto("/en/admin/prospects");
  const after = admin.getByTestId("prospect-row").filter({ hasText: name });
  await expect(after).toHaveAttribute("data-status", "joined");
  await expect(after.getByTestId("prospect-invitation")).toHaveAttribute("data-state", "claimed");
  if (hasVideo) await expect(after.getByTestId("invitation-watched")).toHaveAttribute("data-watched", "true");
  await expect(after.getByTestId("invitation-number")).toContainText("Founding Member №");
});
