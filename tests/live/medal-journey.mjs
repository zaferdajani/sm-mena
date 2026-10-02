// Live medal check on sawwiq.org (docs/57): a QA letter (created and deleted by the workflow)
// is opened as a visitor, then by the seeded demo provider, who watches the video, claims the
// letter for the demo page, and should see the medal in the Studio and on the page.
// Env: SITE_URL, DEMO_EMAIL, DEMO_PASSWORD, CODE. Screenshots and medal.json → ./live-evidence.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const site = (process.env.SITE_URL || "https://sawwiq.org").replace(/\/$/, "");
const { DEMO_EMAIL: email, DEMO_PASSWORD: password, CODE: code } = process.env;
if (!email || !password || !code) {
  console.log("::error::DEMO_EMAIL, DEMO_PASSWORD and CODE are required.");
  process.exit(2);
}
mkdirSync("live-evidence", { recursive: true });
const evidence = { site, code, startedAt: new Date().toISOString(), steps: [] };
const step = (name, ok, detail) => {
  evidence.steps.push({ name, ok, detail });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(name);
};
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const shot = async (page, name) => page.screenshot({ path: `live-evidence/${name}.png`, fullPage: true }).catch(() => undefined);
try {
  const version = await (await fetch(`${site}/api/version`)).json();
  step("version", Boolean(version.launchPhase), `${version.commit ?? "local"} ${version.launchPhase}`);

  // A visitor scans the letter.
  const visitor = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await visitor.goto(`${site}/ar/i/${code}`);
  const state = await visitor.getByTestId("pioneer-invite").getAttribute("data-state");
  const left = (await visitor.getByTestId("pioneer-medals-left").textContent())?.trim();
  await shot(visitor, "1-letter-visitor");
  step("letter page opens", state === "open", `state ${state}; ${left}`);
  const claimDisabled = await visitor.getByTestId("pioneer-claim").getAttribute("aria-disabled");
  step("claim waits for the video", claimDisabled === "true", `aria-disabled ${claimDisabled}`);

  // The demo provider signs in and opens the same letter.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar" });
  const page = await ctx.newPage();
  await page.goto(`${site}/en/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30_000 });
  step("sign in", true, new URL(page.url()).pathname);
  await page.goto(`${site}/ar/i/${code}`);
  const button = page.getByTestId("pioneer-claim-mine");
  step("claim for my page waits for the video", await button.isDisabled(), "disabled before the video");

  // Watch to the end: real playback when the browser can decode H.264, otherwise the end event.
  const canPlay = await page.evaluate(() => document.querySelector("video")?.canPlayType('video/mp4; codecs="avc1.640028"') || "");
  if (canPlay) {
    await page.evaluate(async () => {
      const v = document.querySelector("video");
      v.muted = true;
      await v.play().catch(() => undefined);
      await new Promise((r) => (v.readyState >= 1 ? r() : v.addEventListener("loadedmetadata", r, { once: true })));
      v.currentTime = Math.max(0, v.duration - 1.5);
    });
  } else {
    await page.evaluate(() => document.querySelector("video")?.dispatchEvent(new Event("ended")));
  }
  await page.locator('[data-testid="pioneer-watch-state"][data-watched="true"]').waitFor({ timeout: 60_000 });
  step("video watched to the end", true, canPlay ? "played (seeked near the end)" : "end event (browser has no H.264 decoder)");
  await shot(page, "2-letter-watched");
  await button.click();
  await page.waitForURL(/\/studio/, { timeout: 30_000 });
  const panel = page.getByTestId("medal-panel");
  await panel.waitFor({ timeout: 30_000 });
  const panelState = await panel.getAttribute("data-state");
  const missing = await panel.locator('[data-done="false"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-item")));
  await shot(page, "3-studio-medal");
  step("medal awarded to the complete page", panelState === "awarded", `panel ${panelState}${missing.length ? `; missing ${missing.join(", ")}` : ""}; ${(await panel.textContent())?.trim()}`);

  await page.goto(`${site}/ar/a/nakhla.studio`);
  const badge = await page.getByTestId("pioneer-badge").count();
  const early = await page.getByTestId("founding-badge").count();
  await shot(page, "4-profile-badge");
  step("profile shows the medal, not the early-member badge", badge === 1 && early === 0, `${(await page.getByTestId("pioneer-badge").textContent().catch(() => ""))?.trim()}`);

  await page.goto(`${site}/ar/i/${code}`);
  step("letter page now says claimed", (await page.getByTestId("pioneer-invite").getAttribute("data-state")) === "claimed");
  await shot(page, "5-letter-claimed");
} catch (e) {
  evidence.error = String(e?.message ?? e);
} finally {
  evidence.finishedAt = new Date().toISOString();
  writeFileSync("live-evidence/medal.json", JSON.stringify(evidence, null, 2));
  await browser.close();
  process.exit(evidence.error ? 1 : 0);
}
