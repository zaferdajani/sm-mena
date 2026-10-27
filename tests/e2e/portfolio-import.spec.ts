import { expect, test } from "@playwright/test";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { joinAgency } from "./helpers";

/** A small portfolio: cover, two project pages (the second is pictures only), a clients page. */
async function portfolioPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = (lines: string[], color: [number, number, number]) => {
    const p = doc.addPage([595, 842]);
    p.drawRectangle({ x: 40, y: 300, width: 515, height: 400, color: rgb(...color) });
    lines.forEach((l, i) => p.drawText(l, { x: 40, y: 760 - i * 24, size: 18, font }));
  };
  page(["Portfolio 2026"], [0.1, 0.4, 0.3]);
  page(["Rose Cafe launch", "Client: Rose Cafe", "Instagram management and photography for a cafe."], [0.8, 0.5, 0.3]);
  page([], [0.3, 0.3, 0.7]);
  page(["Our clients", "Rose Cafe", "Petra Motors"], [0.9, 0.9, 0.9]);
  return Buffer.from(await doc.save());
}

// Studio → Import a PDF portfolio (docs/36-portfolio-import.md). Without an AI
// key the page-text rules prepare the drafts; the agency reviews, then publishes.
test("an agency turns its PDF portfolio into posts and clients", async ({ page }) => {
  test.setTimeout(120_000);
  await joinAgency(page, "pdf");
  await page.goto("/en/studio/new");
  await page.getByTestId("import-link").click();
  await expect(page).toHaveURL(/\/en\/studio\/import/);
  await page.getByTestId("import-file").setInputFiles({ name: "portfolio.pdf", mimeType: "application/pdf", buffer: await portfolioPdf() });

  const review = page.getByTestId("import-review");
  await expect(review).toBeVisible({ timeout: 60_000 });
  const drafts = review.getByTestId("import-draft");
  await expect(drafts).toHaveCount(1); // pages 2 and 3 are one project
  await expect(drafts.first()).toContainText("Rose Cafe launch");
  await expect(drafts.first().locator("img")).toHaveCount(2);
  await expect(review.getByTestId("import-client")).toHaveCount(2);

  // The picture picker lists every picture found; a picked page becomes a new post.
  await page.getByTestId("open-pictures").click();
  const pictures = page.getByTestId("picture");
  await expect(pictures.first()).toBeVisible();
  const before = await pictures.count();
  expect(before).toBeGreaterThanOrEqual(4); // at least the four pages
  await page.getByRole("tab", { name: /Pages/ }).click();
  await pictures.last().click();
  await page.getByTestId("pictures-to-post").click();
  await expect(drafts).toHaveCount(2);
  // Untick the new one so the published count stays the same.
  await drafts.last().getByTestId("draft-include").uncheck();

  await page.getByTestId("import-publish").click();
  await expect(page.getByTestId("import-done")).toContainText("1 post published", { timeout: 60_000 });
  await expect(page.getByTestId("import-done")).toContainText("2 clients added");
  await page.getByRole("link", { name: "See my clients" }).click();
  await expect(page.locator("main")).toContainText("Rose Cafe");
  await expect(page.locator("main")).toContainText("Petra Motors");
});

// Report 6E5F4BD2: on iPhone the PDF never loaded. iOS Safari caps the memory
// all canvases on a page may hold; the reader kept a full-size canvas per page
// until the end, so a long portfolio crossed the cap and the read failed.
test("reading a PDF portfolio releases every canvas it drew on", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const made: HTMLCanvasElement[] = [];
    (window as unknown as { __canvases: HTMLCanvasElement[] }).__canvases = made;
    const create = Document.prototype.createElement;
    Document.prototype.createElement = function (this: Document, tag: string, options?: ElementCreationOptions) {
      const el = create.call(this, tag, options);
      if (tag.toLowerCase() === "canvas") made.push(el as HTMLCanvasElement);
      return el;
    } as typeof create;
  });
  await joinAgency(page, "pdfmem");
  await page.goto("/ar/studio/import");
  await page.getByTestId("import-file").setInputFiles({ name: "portfolio.pdf", mimeType: "application/pdf", buffer: await portfolioPdf() });
  await expect(page.getByTestId("import-review")).toBeVisible({ timeout: 60_000 });

  const held = await page.evaluate(() => {
    const all = (window as unknown as { __canvases: HTMLCanvasElement[] }).__canvases;
    return { drawn: all.length, pixels: all.filter((c) => !c.isConnected).reduce((n, c) => n + c.width * c.height, 0) };
  });
  expect(held.drawn).toBeGreaterThan(4); // the reader did draw the pages
  // Before the fix a four-page PDF left about 21 million pixels held. A tiny
  // 1x1 probe canvas of pdf.js's own may remain; no page-sized canvas may.
  expect(held.pixels).toBeLessThan(10_000);
});
