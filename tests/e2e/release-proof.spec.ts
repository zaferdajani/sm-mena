import { expect, test } from "@playwright/test";

test("version is not cached and matches landing and app render stamps", async ({ page, request }) => {
  const response = await request.get("/api/version");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const release = await response.json();
  expect(release.revision).toBe("layout-2026-09-27-v1");
  expect(["production", "preview", "development", "unknown"]).toContain(release.environment);
  expect(release.commit === null || /^[a-f0-9]{40}$/.test(release.commit)).toBe(true);
  await page.addInitScript(() => localStorage.setItem("sw_role", "browse"));
  for (const route of ["/ar?intro=0", "/en/explore?tab=agencies"]) {
    await page.goto(route);
    const stamp = page.getByTestId("release-stamp");
    await expect(stamp).toHaveAttribute("data-ui-revision", release.revision);
    await expect(stamp).toHaveAttribute("data-release-sha", release.commit ?? "unknown");
    await expect(stamp).toHaveAttribute("data-release-environment", release.environment);
  }
});
