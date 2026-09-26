import { expect, test, type Page } from "@playwright/test";

// Saudi demo agencies (lib/db/demo-portfolio.ts and the seed).
const SAUDI = ["riyadh.pulse", "najd.creative", "jeddah.growth", "dammam.studio", "khobar.brands", "makkah.hospitality", "abha.trails", "madinah.dates"];

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "sw_country", value: "sa", url: baseURL! }]);
});

/** Every card is a Saudi agency, or one based elsewhere that is labelled as serving Saudi Arabia. */
async function expectSaudiResults(page: Page) {
  const cards = page.getByTestId("recommendation-card");
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  let saudi = 0;
  for (const card of await cards.all()) {
    const handle = (await card.innerText()).match(/@([a-z0-9._]+)/)![1];
    if ((await card.getAttribute("data-country")) === "sa") {
      expect(SAUDI).toContain(handle);
      saudi++;
    } else {
      await expect(card.getByTestId("serves-tag")).toContainText("السعودية");
    }
  }
  expect(saudi).toBeGreaterThan(0);
  // Money is in riyals, never dinars.
  const text = await page.getByTestId("recommendation").last().innerText();
  expect(text).toContain("ر.س");
  expect(text).not.toContain("د.أ");
}

test("the guided matchmaker walks through choices and stays in Saudi Arabia", async ({ page }) => {
  await page.goto("/ar/match");
  const choices = page.getByTestId("wizard-choices");
  await expect(choices).toHaveAttribute("data-step", "groups");

  // 1. Service groups (multi-select, then Next).
  const social = page.getByTestId("choice-group-social_media");
  await social.click();
  await expect(social).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("choice-next").click();
  await expect(page.getByTestId("user-message").last()).toHaveText("السوشيال ميديا");
  await expect(choices).toHaveAttribute("data-step", "services");
  await page.getByTestId("choice-any").click();

  // 2. Business.
  await expect(choices).toHaveAttribute("data-step", "industry");
  await page.getByTestId("choice-industry-restaurant_cafe").click();

  // 3. Platforms.
  await expect(choices).toHaveAttribute("data-step", "platforms");
  await page.getByTestId("choice-platform-instagram").click();
  await page.getByTestId("choice-platform-snapchat").click();
  await page.getByTestId("choice-next").click();

  // 4. Budget, in riyals.
  await expect(choices).toHaveAttribute("data-step", "budget");
  await expect(choices).toContainText("ر.س");
  await expect(choices).not.toContainText("د.أ");
  await page.getByTestId("choice-budget-2").click();

  // 5. City: Saudi cities only.
  await expect(choices).toHaveAttribute("data-step", "city");
  await expect(page.getByTestId("choice-city-amman")).toHaveCount(0);
  await page.getByTestId("choice-city-riyadh").click();

  // 6. Results.
  await expectSaudiResults(page);
  await expect(choices).toHaveAttribute("data-step", "results");
  await expect(page.getByTestId("send-project")).toBeVisible();
  await expect(page.getByTestId("chat-input")).toHaveAttribute("placeholder", /الرياض/);
});

test("a city in another country is questioned, not followed", async ({ page }) => {
  await page.goto("/ar/match");
  await page.getByTestId("chat-input").fill("أحتاج إدارة حساب إنستغرام لمطعم في عمّان");
  await page.getByTestId("chat-send").click();
  const choices = page.getByTestId("wizard-choices");
  await expect(choices).toHaveAttribute("data-step", "switch", { timeout: 20_000 });
  await expect(page.getByTestId("assistant-message").last()).toContainText("الأردن");
  await page.getByTestId("choice-switch-no").click();
  await expectSaudiResults(page);
});

test("switching language re-words the wizard's questions, and Next sits under the options", async ({ page }) => {
  await page.goto("/ar/match");
  await expect(page.getByTestId("assistant-message").last()).toContainText("ما الذي تبحث عنه");
  await page.goto("/en/match");
  await expect(page.getByTestId("assistant-message").last()).toHaveText("What are you looking for? Pick one or more.");
  const next = page.getByTestId("choice-next");
  await expect(next).toBeDisabled();
  const lastOption = await page.locator('[data-testid^="choice-group-"]').last().boundingBox();
  const nextBox = await next.boundingBox();
  expect(nextBox!.y).toBeGreaterThan(lastOption!.y + lastOption!.height);
  await page.getByTestId("choice-group-social_media").click();
  await expect(next).toBeEnabled();
});

test("each answer brings the next question and its options into view", async ({ page }) => {
  await page.goto("/ar/match");
  const question = page.getByTestId("assistant-message").last();
  const choices = page.getByTestId("wizard-choices");
  const nearTop = async () => expect.poll(async () => (await question.boundingBox())!.y).toBeLessThan(200);

  await page.getByTestId("choice-group-social_media").click();
  await page.getByTestId("choice-next").click();
  await expect(choices).toHaveAttribute("data-step", "services");
  await nearTop();
  await expect(choices.locator("button").first()).toBeInViewport();

  await page.getByTestId("choice-any").click();
  await expect(choices).toHaveAttribute("data-step", "industry");
  await nearTop();
  await expect(choices.locator("button").first()).toBeInViewport();
});

test("the chat survives browsers whose scrollIntoView returns a Promise", async ({ page }) => {
  // Newer Chromium returns a Promise; returned from an effect, React called it as a cleanup and the page crashed.
  await page.addInitScript(() => {
    const scroll = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args: Parameters<typeof scroll>) {
      scroll.apply(this, args);
      return Promise.resolve() as unknown as void;
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/ar/match");
  await page.getByTestId("chat-input").fill("أحتاج إدارة حسابات إنستغرام لمطعم");
  await page.getByTestId("chat-send").click();
  await expect(page.getByTestId("wizard-choices")).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});
