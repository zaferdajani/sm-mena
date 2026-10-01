import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers";

// Admin → Prospects (docs/55): the researched launch list, the owner's own names and contact status.
test("the admin adds the researched list and a name, then tracks contact", async ({ page }, info) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/en/admin/prospects");
  await expect(page.getByTestId("admin-prospects")).toBeVisible();
  await page.getByTestId("prospects-import").click();
  await expect(page.getByTestId("prospects-imported")).toBeVisible();
  const upt = page.getByTestId("prospect-row").filter({ hasText: "UPT House" });
  await expect(upt).toBeVisible();
  await expect(upt.getByRole("link", { name: "@theupthouse" })).toHaveAttribute("href", "https://www.instagram.com/theupthouse/");
  await expect(page.getByTestId("prospect-row").filter({ hasText: "Muhannad" })).toBeVisible();
  // Importing again adds nothing.
  await page.getByTestId("prospects-import").click();
  await expect(page.getByTestId("prospects-imported")).toContainText("0 added");

  const name = `Olive Branch Media ${info.project.name} ${Date.now().toString(36)}`;
  const form = page.getByTestId("prospect-add");
  await form.locator("#pr-name").fill(name);
  await form.locator("#pr-website").fill("olivebranch.jo");
  await form.locator("#pr-instagram").fill("@olivebranchjo");
  await form.locator("#pr-services").fill("social media, video");
  await form.getByRole("button", { name: "Add to the list" }).click();
  await expect(page.getByTestId("prospect-added")).toContainText(name);
  const row = page.getByTestId("prospect-row").filter({ hasText: name });
  await expect(row).toHaveAttribute("data-status", "new");
  await expect(row.getByText("video")).toBeVisible();
  await row.getByTestId("prospect-contacted").click();
  await expect(row).toHaveAttribute("data-status", "contacted");
  await expect(row.getByTestId("prospect-status")).toHaveValue("contacted");
  await expect(row.getByText(/contacted \d{4}-\d{2}-\d{2}/)).toBeVisible();

  // Arabic, on the phone.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/admin/prospects");
  await expect(page.getByRole("heading", { name: "الوكالات المستهدفة للإطلاق" })).toBeVisible();
  await expect(page.getByTestId("prospect-row").filter({ hasText: name }).getByTestId("prospect-status")).toHaveValue("contacted");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
