import { expect, test } from "@playwright/test";
import { ApiFailure, createClient, memoryStore } from "../../mobile/src/api/client";
import { missingForPublish } from "../../mobile/src/api/contract";
import { joinAgency, pngBuffer } from "./helpers";

// The Expo app's API layer (mobile/src/api) completes slice A against the real e2e server, exactly as the
// screens call it: sign in → profile → source → upload → resume from /me → client → project → preview rule →
// publish → owner-only project and media → logout-all revokes the device. The app's version header rides on
// every call; a server minimum newer than the app would answer 426 (unit-tested in tests/unit/api-v1.test.ts).

test.describe.configure({ mode: "serial" });

test("the app client completes the setup slice and private media stays owner-only", async ({ page, request, baseURL }) => {
  test.setTimeout(120_000);
  const account = await joinAgency(page, "mobile", { stay: true });
  await page.goto("/en/studio/publication");
  await page.check('input[name="visibility"][value="private"]');
  await page.check('input[name="acknowledge"]');
  await page.getByRole("button", { name: "Save publication choice" }).click();
  await expect(page).toHaveURL(/saved=1/);

  const store = memoryStore();
  const events: string[] = [];
  const client = createClient({ baseUrl: baseURL!, store, app: { version: "0.1.0", platform: "ios" }, onUnauthenticated: () => events.push("unauthenticated"), onUpgradeRequired: () => events.push("upgrade") });

  await expect(client.auth.login(account.email, "not-it")).rejects.toMatchObject({ code: "unauthenticated", reason: "invalidCredentials" });
  await client.auth.login(account.email, account.password);
  expect((await store.get())?.token).toBeTruthy();

  let me = await client.setup.me();
  expect(me.agency?.handle).toBe(account.handle);
  expect(me.agency?.visibility).toBe("private");
  expect(me.setup?.status).toBe("in_progress");

  let setup = (await client.setup.patchProfile({ version: me.setup!.version, bio: "Product photography for small brands.", services: ["photography"] })).setup;
  setup = (await client.setup.step(setup.version, 2)).setup;
  setup = (await client.setup.source(setup.version, "upload")).setup;
  expect(setup.step).toBe(3);

  // The screens upload file parts; here a Blob stands in for the picked photo.
  setup = (await client.setup.upload([new Blob([await pngBuffer("#1f6e50", 900, 700)], { type: "image/png" })])).setup;
  expect(setup.media).toHaveLength(1);
  const draftImage = await client.imageBytes(setup.media[0].url);
  expect(draftImage.status).toBe(200);
  expect(draftImage.type).toBe("image/webp");
  expect((await request.get(setup.media[0].url)).status()).toBe(401);

  // Resume: a fresh app start reads step, version and media from /me.
  me = await client.setup.me();
  expect(me.setup).toMatchObject({ step: 3, data: { source: "upload" } });
  expect(me.setup!.media).toHaveLength(1);
  setup = me.setup!;

  setup = (await client.setup.client(setup.version, { mode: "personal" })).setup;
  expect(missingForPublish(setup)).toBe("noProject");
  setup = (await client.setup.project(setup.version, { title: "Spring catalogue", contribution: "Concept, shoot and retouching", services: ["photography"] })).setup;
  expect(setup.step).toBe(5);
  expect(missingForPublish(setup)).toBeNull();

  // A stale version is refused and reported as such; the screen then reloads the draft.
  const stale = await client.setup.publish(setup.version - 1, true).catch((e) => e);
  expect(stale).toBeInstanceOf(ApiFailure);
  expect(stale.code).toBe("stale");
  const published = await client.setup.publish(setup.version, true);
  expect(published.postId).toMatch(/^[0-9a-f-]{36}$/);
  expect(published.setup.status).toBe("finished");

  const own = await client.projects.get(published.postId);
  expect(own.owner).toBe(true);
  const imageUrl = own.project.images[0].url;
  expect((await client.imageBytes(imageUrl)).status).toBe(200);
  expect((await request.get(imageUrl)).status()).toBe(404);
  expect((await request.get(`/api/v1/projects/${published.postId}`)).status()).toBe(404);

  // Another provider's app cannot see it either.
  const otherPage = await page.context().browser()!.newPage();
  const other = await joinAgency(otherPage, "mobileb", { stay: true });
  await otherPage.close();
  const otherClient = createClient({ baseUrl: baseURL!, store: memoryStore(), app: { version: "0.1.0", platform: "android" } });
  await otherClient.auth.login(other.email, other.password);
  await expect(otherClient.projects.get(published.postId)).rejects.toMatchObject({ code: "not_found" });
  expect((await otherClient.imageBytes(imageUrl)).status).toBe(404);

  // The web still shows the work for the same account.
  await page.goto("/en/studio");
  await expect(page.getByText("Spring catalogue").first()).toBeVisible();

  // Logout-all from the app ends the device session; the next call signs the device out through the callback.
  const secondDevice = createClient({ baseUrl: baseURL!, store: memoryStore(), app: { version: "0.1.0", platform: "android" } });
  await secondDevice.auth.login(account.email, account.password);
  await client.auth.logoutAll();
  expect(await store.get()).toBeNull();
  await expect(secondDevice.setup.me()).rejects.toMatchObject({ code: "unauthenticated" });
  expect(events).toEqual([]);
});
