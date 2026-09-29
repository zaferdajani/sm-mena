import { expect, test } from "@playwright/test";
import { uniqueHandle } from "./helpers";

// The WhatsApp field starts with the visitor's country (from the IP address),
// and any country can be picked (lib/dial-codes.ts).
test("sign-up starts the WhatsApp code from the visitor's country, and any country can be chosen", async ({ browser }) => {
  const page = await (await browser.newContext({ extraHTTPHeaders: { "x-vercel-ip-country": "SA" } })).newPage();
  await page.goto("/en/join");
  const field = page.getByTestId("phone-whatsapp");
  await expect(field.getByTestId("phone-dial")).toHaveText("+966");
  await field.getByTestId("phone-country").selectOption("EG");
  await expect(field.getByTestId("phone-dial")).toHaveText("+20");

  const handle = uniqueHandle("phone");
  await page.fill("#name", `Agency ${handle}`);
  await page.fill("#handle", handle);
  await page.fill("#whatsapp", "0101 234 5678");
  await page.fill("#email", `${handle}@test.jo`);
  await page.fill("#password", "password-123");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Create page" }).click();
  // Sign-up opens the first-run setup (docs/53); this test continues in the full profile editor.
  await page.waitForURL(/\/en\/portfolio-setup/);
  await page.goto("/en/studio/profile?welcome=1");
  // Saved as +20…, and the studio shows it back under Egypt.
  const saved = page.getByTestId("phone-whatsapp");
  await expect(saved.getByTestId("phone-dial")).toHaveText("+20");
  await expect(page.locator("#whatsapp")).toHaveValue("1012345678");
});
