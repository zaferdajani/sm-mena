import { expect, test } from "@playwright/test";
import { ADMIN, login, uniqueHandle } from "./helpers";

// Referral agents (docs/42): an admin adds an agent, a provider signs up through
// the agent's link, and the agent sees the sign-up and what it still needs.
test("an agent's link credits the sign-up, and the agent sees it on their page", async ({ browser }, info) => {
  test.skip(info.project.name === "mobile", "one run is enough; the pages are checked on phones below");
  const admin = await (await browser.newContext()).newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/en/admin/agents");
  const code = `ag${Date.now().toString(36)}`;
  const email = `${code}@agents.test`;
  const form = admin.getByTestId("agent-create");
  await form.locator("#ag-name").fill("Ahmad Saleh");
  await form.locator("#ag-email").fill(email);
  await form.locator("#ag-code").fill(code);
  await form.getByRole("button", { name: "Add agent" }).click();
  const password = (await admin.getByTestId("agent-password").textContent())!.trim();
  await expect(admin.getByTestId("agent-row").filter({ hasText: code })).toBeVisible();

  // A provider opens the agent's link: the code is filled in at sign-up.
  const provider = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await provider.goto(`/j/${code}`);
  await expect(provider).toHaveURL(/\/join$/);
  await expect(provider.getByTestId("join-ref")).toHaveValue(code);
  const handle = uniqueHandle("ref");
  await provider.fill("#name", `Agency ${handle}`);
  await provider.fill("#handle", handle);
  await provider.fill("#whatsapp", "0791112233");
  await provider.fill("#email", `${handle}@test.jo`);
  await provider.fill("#password", "password-123");
  await provider.check('input[name="consent"]');
  await provider.getByRole("button", { name: /Create page|إنشاء/ }).click();
  await provider.waitForURL(/\/studio\/profile/);

  // The agent signs in and sees the sign-up, not yet active.
  const agent = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await login(agent, email, password);
  await expect(agent).toHaveURL(/\/en\/agent/);
  await expect(agent.getByTestId("agent-link")).toContainText(`/j/${code}`);
  await expect(agent.getByTestId("agent-qr").locator("svg")).toBeVisible();
  const row = agent.getByTestId("agent-referred").locator("li").filter({ hasText: handle });
  await expect(row.getByTestId("referral-status")).toHaveText("Not complete yet");
  expect(await agent.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  // Admin sees it too, and the CSV export works.
  await admin.goto("/en/admin/agents");
  await expect(admin.getByTestId("agent-row").filter({ hasText: code })).toContainText("1");
  const csv = await admin.request.get("/en/admin/agents/export");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain(code);
});
