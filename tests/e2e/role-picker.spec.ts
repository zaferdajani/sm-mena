import { expect, test } from "@playwright/test";
import { joinAgency, uniqueHandle } from "./helpers";

for (const locale of ["ar", "en"]) {
  test(`${locale} role suggestions reuse SEO aliases and require confirmation for distinct specialties`, async ({ page }, info) => {
    await page.goto(`/${locale}/join`);
    const box = page.getByTestId("role-picker-teamRoles");
    const input = box.getByRole("combobox");
    await expect(box.locator('input[value="seo_specialist"]')).toHaveCount(1);
    await expect(box).toContainText(locale === "ar" ? "مختص SEO" : "SEO specialist");
    await expect(box).not.toContainText("مختص سيو");
    await input.fill("seo");
    await expect(box.getByRole("option").first()).toContainText("SEO");
    await expect(box.getByTestId("role-create")).toHaveCount(0);
    await input.press("Enter");
    await expect(box.locator('input[value="seo_specialist"]')).toBeChecked();
    await input.fill("سيو");
    await expect(box.getByRole("option").first()).toHaveAttribute("aria-disabled", "true");
    await input.press("Enter");
    await expect(box.locator('input[value="seo_specialist"]:checked')).toHaveCount(1);
    await expect(box.getByTestId("role-create")).toHaveCount(0);
    await input.fill("drone");
    await input.press("ArrowDown");
    await input.press("Enter");
    await expect(box.locator('input[value="drone_operator"]')).toBeChecked();
    await input.fill("SEO for restaurants");
    await expect(box.getByRole("option").first()).toContainText("SEO");
    await expect(box.getByTestId("role-create")).toHaveCount(0);
    await box.getByTestId("role-distinct").click();
    await box.getByTestId("role-create").click();
    await expect(box.locator('input[value="custom:SEO for restaurants"]')).toBeChecked();
    await input.fill("seo FOR restaurants");
    await expect(box.getByTestId("role-create")).toHaveCount(0);
    await input.press("Escape");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await info.attach(`${locale}-role-picker`, { body: await box.screenshot(), contentType: "image/png" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  });
}

test("added roles survive signup, reload, profile save and removal", async ({ page }, info) => {
  test.setTimeout(120_000);
  const handle = uniqueHandle("role");
  await page.goto("/en/join");
  await page.fill("#name", `Agency ${handle}`);
  await page.fill("#handle", handle);
  await page.fill("#whatsapp", "0791112233");
  await page.fill("#email", `${handle}@test.jo`);
  await page.fill("#password", "password-123");
  const box = page.getByTestId("role-picker-teamRoles");
  await box.getByRole("combobox").fill("Healthcare set stylist");
  await box.getByTestId("role-create").click();
  await box.getByRole("combobox").fill("SEO");
  await box.getByRole("combobox").press("Enter");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Create page", exact: true }).click();
  await page.waitForURL(/\/en\/portfolio-setup/);
  await page.goto("/en/studio/profile");
  await expect(page.locator('input[name="teamRoles"][value="custom:Healthcare set stylist"]')).toBeChecked();
  await expect(page.locator('input[name="teamRoles"][value="seo_specialist"]')).toBeChecked();
  const team = page.getByTestId("role-picker-teamRoles");
  await team.getByRole("combobox").fill("healthcare   SET STYLIST");
  await expect(team.getByRole("option").first()).toHaveAttribute("aria-disabled", "true");
  await expect(team.getByTestId("role-create")).toHaveCount(0);
  await team.getByRole("combobox").fill("");
  await team.locator('label:has(input[value="custom:Healthcare set stylist"])').click();
  await page.getByTestId("profile-form").locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/studio/profile"));
  await page.goto("/en/studio/profile");
  await expect(page.locator('input[name="teamRoles"][value="custom:Healthcare set stylist"]')).toHaveCount(0);
  await expect(page.locator('input[name="teamRoles"][value="seo_specialist"]')).toBeChecked();
  await info.attach("roles-persisted", { body: await page.getByTestId("team-fields").screenshot(), contentType: "image/png" });
});

test("freelancer role entry fits at 320px and switching kind retains choices", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/ar/join");
  const box = page.getByTestId("role-picker-teamRoles");
  await box.getByRole("combobox").fill("مصمم أغلفة طبية");
  if (await box.getByTestId("role-distinct").count()) await box.getByTestId("role-distinct").click();
  await box.getByTestId("role-create").click();
  await page.getByTestId("kind-freelancer").check();
  await expect(box.locator('input[value="custom:مصمم أغلفة طبية"]')).toBeChecked();
  await box.getByRole("combobox").fill("مُصمم أغلفة طبية");
  await expect(box.getByTestId("role-create")).toHaveCount(0);
  await expect(box.getByRole("option").first()).toHaveAttribute("aria-disabled", "true");
  await info.attach("320-rtl-roles", { body: await box.screenshot(), contentType: "image/png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
});
