import { expect, test } from "@playwright/test";

test("sign-in remains usable with a slow mobile CPU and network", async ({ page, context }) => {
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await session.send("Network.enable");
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 200_000,
    uploadThroughput: 90_000,
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/en/login");
  expect(response?.ok()).toBe(true);
  const email = page.locator('input[type="email"]');
  await expect(email).toBeVisible();
  await email.fill("performance@example.test");
  await expect(email).toHaveValue("performance@example.test");
  expect(errors).toEqual([]);
});
