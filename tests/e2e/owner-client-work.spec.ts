import { expect, test } from "@playwright/test";
import { joinAgency, pngBuffer } from "./helpers";

// Owners asked how work under a client is added (staging feedback, 2026-10-31): on their own client page and
// Clients tab they get "Add work for this client", which opens the post form with that client chosen. Visitors never see it.
test("an owner adds work from their client's page, with the client already chosen", async ({ page, browser }) => {
  const { handle } = await joinAgency(page, "ownerwork");
  await page.goto("/en/studio/clients");
  const form = page.getByTestId("client-form");
  await form.getByLabel("Business name", { exact: true }).fill("Ramp Parts");
  await form.getByRole("button", { name: "Save client" }).click();
  await expect(page.getByTestId("client-item")).toContainText("Ramp Parts");
  await expect(page.getByTestId("client-add-work")).toHaveAttribute("href", /\/en\/studio\/new\?client=[0-9a-f-]{36}$/);

  // The Clients tab: a panel for the owner and "Add work" on the card.
  await page.goto(`/en/a/${handle}?tab=clients`);
  await expect(page.getByTestId("owner-client-panel")).toBeVisible();
  await expect(page.getByTestId("client-card-add-work")).toBeVisible();
  const clientUrl = await page.getByTestId("client-open").getAttribute("href");
  const clientId = clientUrl!.split("/c/")[1];

  // The client's page: one tap to add work for it.
  await page.goto(clientUrl!);
  const panel = page.getByTestId("owner-client-panel");
  await expect(panel).toContainText("Ramp Parts");
  await panel.getByTestId("owner-add-client-work").click();
  await expect(page).toHaveURL(new RegExp(`/en/studio/new\\?client=${clientId}$`));
  await expect(page.locator("#clientId")).toHaveValue(clientId);
  await page.getByTestId("image-input").setInputFiles({ name: "work.png", mimeType: "image/png", buffer: await pngBuffer("#0f766e", 900, 900) });
  await page.fill("#caption", "Product photos for Ramp Parts");
  await page.locator('label:has(input[name="services"])').first().click();
  await page.getByTestId("publish-button").click();
  await expect(page).toHaveURL(/\/en\/p\//, { timeout: 30_000 });
  await expect(page.getByTestId("post-client")).toContainText("For Ramp Parts");
  await page.goto(clientUrl!);
  await expect(page.getByTestId("account-page").getByTestId("post-grid").locator("a")).toHaveCount(1);

  // A visitor sees the client page without the owner's panel.
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(clientUrl!);
  await expect(visitor.getByTestId("account-page")).toContainText("Ramp Parts");
  await expect(visitor.getByTestId("owner-client-panel")).toHaveCount(0);
  await visitor.goto(`/en/a/${handle}?tab=clients`);
  await expect(visitor.getByTestId("client-card-add-work")).toHaveCount(0);
});
