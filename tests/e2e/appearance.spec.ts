import { expect, test } from "@playwright/test";
import { ADMIN, login, pngBuffer } from "./helpers";

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

test("an admin sets a dated background for the Saudi interface only", async ({ page, browser, baseURL }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/en/admin/appearance");
  const form = page.getByTestId("background-form");
  await form.getByLabel("Name").fill("Flag Day test");
  await form.getByLabel("Shown to").selectOption("sa");
  await form.getByLabel("From (optional)").fill(day(-1));
  await form.getByLabel("Until (optional)").fill(day(1));
  await form.getByLabel("Image or video").setInputFiles({ name: "flag.png", mimeType: "image/png", buffer: await pngBuffer("#006c35", 1200, 800) });
  await expect(page.getByTestId("background-preview")).toBeVisible();
  await form.getByRole("button", { name: "Save background" }).click();
  await expect(page.getByText("Saved. It shows on the interface right away.")).toBeVisible();
  await expect(page.getByTestId("background-today")).toContainText("Flag Day test");

  const host = new URL(baseURL!).hostname;
  const saudi = await browser.newContext();
  await saudi.addCookies([{ name: "sw_country", value: "sa", domain: host, path: "/" }]);
  const sp = await saudi.newPage();
  await sp.goto("/en/feed");
  await expect(sp.getByTestId("interface-background")).toBeAttached();
  await expect(sp.getByTestId("interface-background").locator("img")).toHaveAttribute("src", /\/media\/backgrounds\/.+\.(webp|png|jpg)$/);

  const jordan = await browser.newContext();
  await jordan.addCookies([{ name: "sw_country", value: "jo", domain: host, path: "/" }]);
  const jp = await jordan.newPage();
  await jp.goto("/en/feed");
  await expect(jp.getByTestId("interface-background")).toHaveCount(0);

  // Clean up so other tests see the default interface.
  await page.getByTestId("background-list").getByRole("button", { name: "Delete" }).first().click();
  await expect(page.getByTestId("background-list")).not.toContainText("Flag Day test");
});
