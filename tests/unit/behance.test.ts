import "./setup-db";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadBehancePortfolio, BehanceError } from "@/lib/behance";
import { fixtureFetcher, isBehanceHost } from "@/lib/behance/fetch";
import { bookmarklet, portfolioFromHandoff } from "@/lib/behance/handoff";
import { importBehanceProject } from "@/lib/behance/import";
import { clientFor, ownershipOf, servicesFor } from "@/lib/behance/map";
import { parseFeed, parseProfilePage, parseProjectId, parseProjectPage, parseUsername } from "@/lib/behance/parse";
import { createAgency } from "@/lib/data/agencies";
import { getPost } from "@/lib/data/posts";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";

const DIR = path.resolve("tests/fixtures/behance");
const read = (f: string) => readFileSync(path.join(DIR, f), "utf8");
const fetcher = fixtureFetcher(DIR);
const agency = { handle: "demo.studio", website: null, instagram: null, about: "", services: ["smm_management"], country: "jo" as const };

afterAll(() => closeDb());

describe("reading Behance links", () => {
  it("accepts a username, a profile link or a project link", () => {
    expect(parseUsername("sawwiqdemo")).toBe("sawwiqdemo");
    expect(parseUsername("@sawwiqdemo")).toBe("sawwiqdemo");
    expect(parseUsername("https://www.behance.net/sawwiqdemo/projects")).toBe("sawwiqdemo");
    expect(parseUsername("behance.net/sawwiqdemo")).toBe("sawwiqdemo");
    expect(parseUsername("https://www.behance.net/gallery/101/x")).toBeNull();
    expect(parseUsername("https://dribbble.com/someone")).toBeNull();
    expect(parseUsername("gallery")).toBeNull();
    expect(parseProjectId("https://www.behance.net/gallery/101/rose-boutique")).toBe("101");
    expect(parseProjectId("https://www.behance.net/sawwiqdemo")).toBeNull();
  });

  it("never leaves behance.net", () => {
    expect(isBehanceHost("www.behance.net")).toBe(true);
    expect(isBehanceHost("mir-s3-cdn-cf.behance.net")).toBe(true);
    expect(isBehanceHost("behance.net.evil.com")).toBe(false);
    expect(isBehanceHost("evil.com")).toBe(false);
  });
});

describe("parsing what Behance serves", () => {
  it("lists a profile's projects from its feed with cover, summary and date", () => {
    const items = parseFeed(read("feed-sawwiqdemo.xml"));
    expect(items.map((i) => i.id)).toEqual(["101", "102", "103"]);
    expect(items[0].title).toBe("Rose Boutique | Branding");
    expect(items[0].cover).toContain("boutique-cover.webp");
    expect(items[0].description).toContain("boutique in Amman");
    expect(items[0].publishedAt?.toISOString()).toBe("2026-03-10T10:00:00.000Z");
    expect(items[2].cover).toBeNull();
  });

  it("reads a project page's images, fields, tags and owners, keeping only Behance-hosted images", () => {
    const p = parseProjectPage(read("project-101.html"), "https://www.behance.net/gallery/101/rose-boutique-branding")!;
    expect(p.title).toBe("Rose Boutique | Branding");
    expect(p.images.map((i) => i.url)).toEqual([
      "https://mir-s3-cdn-cf.behance.net/project_modules/source/boutique-1.webp", // the original beats max_1200
      "https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/boutique-2.webp", // inside a media collection; the video is skipped
    ]);
    expect(p.fields).toEqual(["Branding", "Graphic Design", "Packaging"]);
    expect(p.tags).toEqual(["logo", "instagram", "boutique"]);
    expect(p.owners).toEqual(["sawwiqdemo"]);
    expect(p.cover).toContain("projects/404/boutique-cover.webp");
    expect(p.publishedAt?.getUTCFullYear()).toBe(2026);
  });

  it("falls back to the Open Graph tags when the page state is missing", () => {
    const p = parseProjectPage(read("project-102.html"), "https://www.behance.net/gallery/102/petra-hills-hotel")!;
    expect(p.title).toBe("Petra Hills Hotel photography");
    expect(p.images).toEqual([{ url: "https://mir-s3-cdn-cf.behance.net/projects/404/hotel-cover.webp", width: null, height: null }]);
    expect(p.description).toContain("Client: Petra Hills Hotel");
    expect(parseProjectPage(read("project-103.html"), "https://www.behance.net/gallery/103/sketches")).toBeNull();
  });

  it("reads the profile: name, website, bio, picture, fields and links", () => {
    const pr = parseProfilePage(read("profile-sawwiqdemo.html"), "sawwiqdemo")!;
    expect(pr.displayName).toBe("Sawwiq Demo Studio");
    expect(pr.website).toBe("https://demo-studio.jo");
    expect(pr.bio).toContain("small studio in Amman");
    expect(pr.avatar).toContain("/276/avatar.webp");
    expect(pr.fields).toEqual(["Branding", "Photography", "Social Media"]);
    expect(pr.links).toContain("https://sawwiq.org/ar/a/demo.studio");
    expect(pr.links).toContain("https://www.instagram.com/demo.studio");
  });
});

describe("mapping Behance words to Sawwiq", () => {
  const project = parseProjectPage(read("project-101.html"), "https://www.behance.net/gallery/101/rose-boutique-branding")!;

  it("turns fields, tags and text into services and the title into a client", () => {
    expect(servicesFor(project, "jo")).toEqual(expect.arrayContaining(["brand_identity", "graphic_design", "packaging_design"]));
    expect(clientFor(project)).toBe("Rose Boutique");
    expect(clientFor({ ...project, title: "Branding | Rose Boutique" })).toBe("Rose Boutique");
    expect(clientFor({ ...project, title: "Summer campaign", description: "Client: Rose Boutique\nPosts for the season" })).toBe("Rose Boutique");
    expect(clientFor({ ...project, title: "Sketches", description: "" })).toBeNull();
  });

  it("verifies ownership from the website, the Sawwiq page or the Instagram handle, never by default", () => {
    const profile = parseProfilePage(read("profile-sawwiqdemo.html"), "sawwiqdemo");
    expect(ownershipOf(profile, { handle: "demo.studio", website: null, instagram: null })).toBe("verified"); // links to sawwiq.org/a/demo.studio
    expect(ownershipOf(profile, { handle: "someone.else", website: "https://www.demo-studio.jo/", instagram: null })).toBe("verified");
    expect(ownershipOf(profile, { handle: "someone.else", website: null, instagram: "@demo.studio" })).toBe("verified");
    expect(ownershipOf(profile, { handle: "someone.else", website: "https://other.jo", instagram: "other" })).toBe("unverified");
    expect(ownershipOf(null, { handle: "x", website: null, instagram: null })).toBe("unverified");
  });
});

describe("loading a portfolio from saved pages", () => {
  it("proposes one draft per project with images, and profile suggestions", async () => {
    const p = await loadBehancePortfolio("behance.net/sawwiqdemo", agency, fetcher);
    expect(p.source).toBe("feed");
    expect(p.ownership).toBe("verified");
    expect(p.drafts.map((d) => d.project.id)).toEqual(["101", "102"]); // 103 has no pictures
    expect(p.drafts[0].project.images).toHaveLength(2);
    expect(p.drafts[0].services).toContain("brand_identity");
    expect(p.drafts[0].client).toBe("Rose Boutique");
    expect(p.drafts[1].client).toBe("Petra Hills Hotel");
    expect(p.drafts[1].services).toContain("photography");
    expect(p.suggestion.about).toContain("small studio");
    expect(p.suggestion.website).toBe("https://demo-studio.jo");
    expect(p.suggestion.services).toEqual(expect.arrayContaining(["brand_identity", "photography"]));
    expect(p.suggestion.services).not.toContain("smm_management");
  });

  it("imports a single project link too, and names the errors", async () => {
    const one = await loadBehancePortfolio("https://www.behance.net/gallery/101/rose-boutique-branding", agency, fetcher);
    expect(one.source).toBe("project");
    expect(one.drafts).toHaveLength(1);
    expect(one.profile?.username).toBe("sawwiqdemo"); // the owner named on the project
    await expect(loadBehancePortfolio("not a link at all!", agency, fetcher)).rejects.toMatchObject({ code: "invalid" } satisfies Partial<BehanceError>);
    await expect(loadBehancePortfolio("nobodyhere", agency, fetcher)).rejects.toMatchObject({ code: "notFound" });
  });
});

describe("publishing a reviewed project", () => {
  it("downloads the kept images through the same pipeline as an upload and credits the Behance project", async () => {
    const u = await createUser("behance@t.jo", "password-1234");
    const a = await createAgency(u.id, { handle: "behance.studio", name: "Behance Studio", city: "amman", services: ["brand_identity"] });
    const post = await importBehanceProject(
      a.id,
      {
        projectUrl: "https://www.behance.net/gallery/101/rose-boutique-branding",
        images: ["https://mir-s3-cdn-cf.behance.net/project_modules/source/boutique-1.webp", "https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/boutique-2.webp"],
        publishedAt: new Date("2026-03-10T10:00:00Z"),
        caption: "Rose Boutique | Branding",
        services: ["brand_identity"],
        platforms: ["instagram"],
        industry: "retail_shop",
        result: null,
      },
      fetcher,
    );
    const view = (await getPost(post.id, a.id))!;
    expect(view.images).toHaveLength(2);
    expect(view.sourceUrl).toBe("https://www.behance.net/gallery/101/rose-boutique-branding");
    expect(view.createdAt).toBe("2026-03-10T10:00:00.000Z");
    // Anything off Behance is refused before a byte is fetched.
    await expect(importBehanceProject(a.id, { projectUrl: "https://www.behance.net/gallery/101/x", images: ["https://evil.example.com/a.webp"], caption: "", services: ["brand_identity"], platforms: [] }, fetcher)).rejects.toThrow();
    await expect(importBehanceProject(a.id, { projectUrl: "https://evil.example.com/gallery/101/x", images: ["https://mir-s3-cdn-cf.behance.net/project_modules/source/boutique-1.webp"], caption: "", services: ["brand_identity"], platforms: [] }, fetcher)).rejects.toThrow();
  });
});

describe("the browser path (bookmarklet handoff)", () => {
  it("reads the page data a Behance tab hands over exactly like a server read", () => {
    const html = read("project-101.html");
    const blobs = [...html.matchAll(/<script[^>]+type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    const p = portfolioFromHandoff({ url: "https://www.behance.net/gallery/101/rose-boutique-branding", blobs, meta: { title: "Rose Boutique | Branding on Behance" } }, agency)!;
    expect(p.source).toBe("project");
    expect(p.drafts).toHaveLength(1);
    expect(p.drafts[0].project.images).toHaveLength(2);
    expect(p.drafts[0].client).toBe("Rose Boutique");
    // The owner object inside the project state carries the website, so ownership can still be checked.
    expect(p.profile?.username).toBe("sawwiqdemo");
    expect(p.ownership).toBe("unverified");
    expect(portfolioFromHandoff({ url: "https://www.behance.net/gallery/101/x", blobs, meta: {} }, { ...agency, website: "https://demo-studio.jo" })?.ownership).toBe("verified");
    // Open Graph only (no state): the cover alone still makes a draft; nothing at all makes none.
    expect(portfolioFromHandoff({ url: "https://www.behance.net/gallery/9/x", blobs: [], meta: { title: "Only a cover on Behance", image: "https://mir-s3-cdn-cf.behance.net/projects/404/hotel-cover.webp" } }, agency)?.drafts[0].project.title).toBe("Only a cover");
    expect(portfolioFromHandoff({ url: "https://www.behance.net/gallery/9/x", blobs: [], meta: {} }, agency)).toBeNull();
  });

  it("is a javascript: link that only speaks to the Sawwiq origin it was made for", () => {
    const href = bookmarklet("https://sawwiq.org", "ar");
    expect(href.startsWith("javascript:")).toBe(true);
    const code = decodeURIComponent(href.slice("javascript:".length));
    expect(code).toContain('window.open("https://sawwiq.org/ar/studio/import/behance?handoff=1"');
    expect(code).toContain('ev.origin==="https://sawwiq.org"');
    expect(code).toContain('postMessage(data,"https://sawwiq.org")');
    expect(code).toContain("behance");
    expect(code).not.toContain("\n");
  });
});
