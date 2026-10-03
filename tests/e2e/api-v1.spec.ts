import { expect, test } from "@playwright/test";
import { joinAgency, pngBuffer } from "./helpers";

// The bearer API, slice A (docs/architecture/mobile-and-api-roadmap.md §8), end to end against the e2e server
// (API_V1_ENABLED is on in playwright.config.ts): sign-in → upload → reload → publish → owner-only media with a
// bearer token, while the browser's cookie session is never accepted by the API.

test.describe.configure({ mode: "serial" });

test("a provider completes the setup flow over the API and only its token can read the private project", async ({ page, request, baseURL }) => {
  test.setTimeout(120_000);
  const account = await joinAgency(page, "apiv1", { stay: true });
  // Keep the page private (the registration phase does this at sign-up; the e2e server runs the full phase).
  await page.goto("/en/studio/publication");
  await page.check('input[name="visibility"][value="private"]');
  await page.check('input[name="acknowledge"]');
  await page.getByRole("button", { name: "Save publication choice" }).click();
  await expect(page).toHaveURL(/saved=1/);

  // The browser's cookie session is not an API identity.
  const cookieOnly = await page.request.get("/api/v1/me");
  expect(cookieOnly.status()).toBe(401);
  expect((await cookieOnly.json()).error.code).toBe("unauthenticated");

  const wrong = await request.post("/api/v1/auth/login", { data: { email: account.email, password: "not-it" } });
  expect(wrong.status()).toBe(401);
  const login = await request.post("/api/v1/auth/login", { data: { email: account.email, password: account.password } });
  expect(login.status()).toBe(201);
  const { token } = await login.json();
  const auth = { Authorization: `Bearer ${token}` };

  const me = await request.get("/api/v1/me", { headers: auth });
  expect(me.status()).toBe(200);
  const profile = await me.json();
  expect(profile.user.email).toBe(account.email);
  expect(profile.agency.handle).toBe(account.handle);
  expect(profile.agency.visibility).toBe("private");
  // The first-run setup page already opened the draft when the account was created.
  expect(profile.setup).toMatchObject({ status: "in_progress" });
  let version: number = profile.setup.version;

  const saved = await request.patch("/api/v1/profile", { headers: auth, data: { version, bio: "Product photography for small brands.", services: ["photography"] } });
  expect(saved.status()).toBe(200);
  version = (await saved.json()).setup.version;

  const source = await request.patch("/api/v1/portfolio", { headers: auth, data: { kind: "source", version, source: "upload" } });
  expect(source.status()).toBe(200);
  version = (await source.json()).setup.version;

  const upload = await request.post("/api/v1/media", {
    headers: auth,
    multipart: { images: { name: "work.png", mimeType: "image/png", buffer: await pngBuffer("#1f6e50", 900, 700) } },
  });
  expect(upload.status()).toBe(201);
  const media = (await upload.json()).setup.media;
  expect(media).toHaveLength(1);
  const image = await request.get(media[0].url, { headers: auth });
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/webp");
  expect((await request.get(media[0].url)).status()).toBe(401);

  // Reload: a fresh GET /me carries the step, version and media the client needs to resume.
  const resumed = await (await request.get("/api/v1/me", { headers: auth })).json();
  expect(resumed.setup).toMatchObject({ step: 3, data: { source: "upload" } });
  expect(resumed.setup.media).toHaveLength(1);
  version = resumed.setup.version;

  const client = await request.patch("/api/v1/portfolio", { headers: auth, data: { kind: "client", version, mode: "personal" } });
  expect(client.status()).toBe(200);
  version = (await client.json()).setup.version;
  const project = await request.patch("/api/v1/portfolio", { headers: auth, data: { kind: "project", version, title: "Spring catalogue", contribution: "Concept, shoot and retouching", services: ["photography"] } });
  expect(project.status()).toBe(200);
  version = (await project.json()).setup.version;

  const stale = await request.post("/api/v1/portfolio/publish", { headers: auth, data: { version: version - 1, rights: true } });
  expect(stale.status()).toBe(409);
  const published = await request.post("/api/v1/portfolio/publish", { headers: auth, data: { version, rights: true } });
  expect(published.status()).toBe(201);
  const { postId } = await published.json();

  const own = await request.get(`/api/v1/projects/${postId}`, { headers: auth });
  expect(own.status()).toBe(200);
  const body = await own.json();
  expect(body.owner).toBe(true);
  const imageUrl: string = body.project.images[0].url;
  expect(imageUrl).toMatch(/^\/api\/portfolio-media\/portfolio\//);
  expect((await request.get(imageUrl, { headers: auth })).status()).toBe(200);
  // Nobody else: an anonymous reader and another provider's token both get 404, never 403.
  expect((await request.get(imageUrl)).status()).toBe(404);
  expect((await request.get(`/api/v1/projects/${postId}`)).status()).toBe(404);

  const otherPage = await page.context().browser()!.newPage();
  const other = await joinAgency(otherPage, "apiv1b", { stay: true });
  await otherPage.close();
  const otherLogin = await request.post("/api/v1/auth/login", { data: { email: other.email, password: other.password } });
  const otherAuth = { Authorization: `Bearer ${(await otherLogin.json()).token}` };
  expect((await request.get(`/api/v1/projects/${postId}`, { headers: otherAuth })).status()).toBe(404);
  expect((await request.get(imageUrl, { headers: otherAuth })).status()).toBe(404);

  // The web still works for the same account: the published work shows in the studio with the cookie session.
  await page.goto("/en/studio");
  await expect(page.getByText("Spring catalogue").first()).toBeVisible();

  // Sign out of the API token; the browser cookie is untouched.
  expect((await request.post("/api/v1/auth/logout", { headers: auth })).status()).toBe(200);
  expect((await request.get("/api/v1/me", { headers: auth })).status()).toBe(401);
  await page.goto("/en/studio");
  await expect(page).toHaveURL(/\/en\/studio/);
  void baseURL;
});

test("the API answers 404 to every path when the server switch is off", async ({ request }) => {
  // The switch is on for this server; the unit contract test covers the off state. Here: unknown paths stay 404.
  expect((await request.get("/api/v1/nothing")).status()).toBe(404);
});
