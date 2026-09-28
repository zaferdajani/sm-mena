import { expect, test, type Page } from "@playwright/test";
import { ADMIN, login } from "./helpers";

// Every test that flips a GLOBAL feature switch state lives here, and only here
// (admin-console.spec.ts only appends a pilot handle to paid_plans, which no other test reads).
//
// Why: a switch is one row for the whole server. While the "collaboration"
// switch sat on "soon" or "off" for a few seconds inside its test, any test in
// a parallel worker that opened a collaboration page in that window saw the
// coming-soon page (HTTP 200) or a 404 instead of the page it expected. That
// was the intermittent "stranger gets 200 instead of 404" failure in
// work-orders.spec.ts and its like: the assertions were right, the timing was
// not. The fix is isolation, not looser assertions: playwright.config.ts runs
// this file as the `switches` project, a teardown of the mobile and desktop
// projects, so it starts only after every other test has finished and runs
// alone, in serial, on one worker. A switch is always put back to its
// starting state in `finally`, so a failure here cannot leak into a rerun.
test.describe.configure({ mode: "serial" });

type State = "on" | "soon" | "off";
type Switch = "collaboration" | "collaboration_delivery" | "collaboration_intelligence" | "prelaunch_home";

/**
 * Sets a switch through Admin → Features and confirms the saved state after a reload. The radio inputs are
 * visually hidden (sr-only), so the visible label is clicked: `check({ force: true })` on the hidden input
 * threw "Element is outside of the viewport" once while the page was still laying out.
 */
async function setState(admin: Page, key: Switch, state: State) {
  await admin.goto("/en/admin/features");
  const radio = admin.getByTestId(`feature-${key}-${state}`);
  await admin.locator("label").filter({ has: radio }).click();
  await expect(radio).toBeChecked();
  await admin.getByTestId(`feature-${key}-save`).click();
  await admin.waitForLoadState("networkidle");
  await admin.reload();
  await expect(admin.getByTestId(`feature-${key}-${state}`)).toBeChecked();
}

async function sessions(browser: Parameters<Parameters<typeof test>[2]>[0]["browser"]) {
  const admin = await (await browser.newContext()).newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  const agency = await (await browser.newContext()).newPage();
  await login(agency, "nakhla-studio@sawwiq.test", "demo-pass-123");
  return { admin, agency };
}

test("the collaboration switch: coming soon refuses the pages, off hides the tab and 404s", async ({ browser }) => {
  const { admin, agency } = await sessions(browser);
  try {
    await setState(admin, "collaboration", "soon");
    await agency.goto("/en/studio/collab");
    await expect(agency.getByTestId("coming-soon")).toHaveAttribute("data-feature", "collaboration");
    await setState(admin, "collaboration", "off");
    const res = await agency.goto("/en/studio/collab/work");
    expect(res?.status()).toBe(404);
    await agency.goto("/en/studio");
    await expect(agency.getByRole("link", { name: "Collaborate" })).toHaveCount(0);
  } finally {
    await setState(admin, "collaboration", "on");
  }
});

test("the delivery switch: coming soon keeps inquiries working; off hides work orders", async ({ browser }) => {
  const { admin, agency } = await sessions(browser);
  try {
    await setState(admin, "collaboration_delivery", "soon");
    await agency.goto("/en/studio/collab/orders/new");
    await expect(agency.getByTestId("coming-soon")).toHaveAttribute("data-feature", "collaboration_delivery");
    await agency.goto("/en/studio/collab/work");
    await expect(agency.getByTestId("collab-work")).toBeVisible();
    await expect(agency.getByTestId("work-orders")).toHaveCount(0);
    await setState(admin, "collaboration_delivery", "off");
    expect((await agency.goto("/en/studio/collab/orders/new"))?.status()).toBe(404);
  } finally {
    await setState(admin, "collaboration_delivery", "on");
  }
});

test("the intelligence switch: coming soon on the planner, off hides it; work orders keep working", async ({ browser }) => {
  const { admin, agency } = await sessions(browser);
  try {
    await setState(admin, "collaboration_intelligence", "soon");
    await agency.goto("/en/studio/collab/plan");
    await expect(agency.getByTestId("coming-soon")).toHaveAttribute("data-feature", "collaboration_intelligence");
    await agency.goto("/en/studio/collab");
    await expect(agency.getByTestId("next-actions")).toHaveCount(0);
    await expect(agency.getByTestId("collab-tab-plan")).toHaveCount(0);
    await setState(admin, "collaboration_intelligence", "off");
    expect((await agency.goto("/en/studio/collab/worksheet"))?.status()).toBe(404);
    await agency.goto("/en/studio/collab/work");
    await expect(agency.getByTestId("collab-work")).toBeVisible();
    await expect(agency.getByTestId("work-templates")).toHaveCount(0);
  } finally {
    await setState(admin, "collaboration_intelligence", "on");
  }
});

test("with the pre-launch switch in preview, staff see the teaser as the front page", async ({ browser }) => {
  const { admin } = await sessions(browser);
  // "Coming soon" shows it to staff only; the e2e server starts with it off (FEATURE_DEFAULTS).
  try {
    await setState(admin, "prelaunch_home", "soon");
    await admin.goto("/ar");
    await expect(admin.getByTestId("teaser-page")).toBeVisible();
    await expect(admin.getByTestId("teaser-account")).toHaveAttribute("href", "/ar/admin");
  } finally {
    await setState(admin, "prelaunch_home", "off");
  }
});

test("every switch is back where the suite started", async ({ browser }) => {
  const { admin } = await sessions(browser);
  await admin.goto("/en/admin/features");
  for (const key of ["collaboration", "collaboration_delivery", "collaboration_intelligence"] as const) await expect(admin.getByTestId(`feature-${key}-on`)).toBeChecked();
  await expect(admin.getByTestId("feature-prelaunch_home-off")).toBeChecked();
});
