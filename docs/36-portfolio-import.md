# 36. Import a PDF portfolio

Most agencies already have a PDF portfolio. Studio → New post → "Have a PDF portfolio?" (or `/studio/import`) turns it into:
- posts, one per project;
- portfolio clients;
- the About introduction and strengths.

The agency reviews everything first. The flow follows Aida's document pipeline in TeamManager:
1. read on the device;
2. propose structured drafts;
3. the person reviews and edits;
4. nothing is written until they confirm.

## Flow

1. **Read on the device** (`lib/portfolio-import/read-pdf.ts`). pdf.js (legacy build, for older phones) renders each page, up to 40 pages. Each page becomes:
   - a full-size JPEG, used as the post image;
   - a small JPEG, at most 220 KB;
   - its text;
   - its **layout**, read from the pixels (`lib/portfolio-import/layout.ts`, pure and unit-tested). The page is cut along its empty gutters into bands, columns and rows. From the pieces:
     - a **gallery**: several photo-sized pieces in a grid ("Our work"): each photo is cut out as its own image, and makes a far better post than the whole page;
     - a **logo wall**: many small pieces spread over the page ("Our clients"): each logo is cut out;
     - a **single** block on an otherwise empty page (a cover with the logo);
     - **plain** otherwise.

     Crops are padded with the page's own colour, squared for logos and blocks.
   - **OCR, on the device**, for pages that are pictures only (most PDF portfolios are exported as flat images). tesseract.js (`lib/portfolio-import/ocr.ts`) reads English and Arabic off the page image, and each logo's wordmark. It costs nothing but the person's own CPU; no text is sent anywhere for reading. The engine and language files are served from `/engines/tesseract` (`scripts/vendor-engines.mjs` copies the worker and core, and downloads the two language packs; the browser falls back to the public tessdata mirror if a pack is missing).

   The pdf.js worker, fonts and character maps are served from `/engines/pdfjs`. The PDF itself never leaves the device.
2. **Propose drafts** (`analyzePortfolioAction`). The pages' text, layout and small images go to the server:
   - **With `ANTHROPIC_API_KEY`**, Claude looks at every page (text and image, up to 24 pages) and fills a single `portfolio_plan` tool (`lib/portfolio-import/ai.ts`):
     - it classifies each page: work, cover, about, services, clients or contact;
     - it groups the pages of each project;
     - it writes a short caption;
     - it picks services, platforms and industry from Sawwiq's lists;
     - it names the client and any result **only when written on the pages**.

     The output is validated: unknown keys are dropped, a page belongs to one post at most, and a post has at most 10 pages. Photos, logos and the cover logo still come from the layout, never from the model.
   - **Without an AI key, or if the AI fails** (the default: the platform pays for no tokens), page rules take over (`lib/portfolio-import/rules.ts`):
     - a logo wall is a clients page, a photo grid is a post of its photos;
     - covers, "about us", "our services", "our clients" and contact pages are recognised by their heading words, in Arabic and English, tolerant of OCR that half-reads a stylised heading ("ABOUT" without "US", "CLIENT" without "OUR");
     - after "our services", text pages describing one service each (a numbered list, a paragraph) continue the section instead of becoming posts;
     - a second title page (a slogan, a quote) after the cover is a cover too;
     - pages with the same heading, or pages with pictures only, join the project before them;
     - services come from the matchmaker's keywords and every catalog name and alias; the profile is offered the services the portfolio talks about that the agency doesn't list yet;
     - the client comes from lines like "Client: …" or "العميل: …"; on a logo wall, one client per logo, named from its wordmark only when the OCR read real words;
     - OCR gibberish is never used as a title or a name; the field is left for the agency to fill.
3. **Review** (`components/studio/portfolio-import.tsx`). A guide at the top says what to do with what was found, and what is still unsorted: the page logo (chosen or not), the accounts (logos found, how many still need a name), and the posts (how many are ready, how many are not filed under an account yet). Each line has a button that opens the right pictures or jumps to the right section. The agency can:
   - open the **picture picker** (`components/studio/picture-picker.tsx`): every picture found in the PDF (photos, logos, blocks and whole pages), filtered by kind, multi-select. A selection becomes a new post, is added to an existing draft, becomes the agency's page logo (one picture), or is added as client logos to name;
   - untick drafts, remove pages, merge a post with the one above, make a post from an unused page;
   - edit the caption, client, result, services, platforms and industry;
   - **file posts under accounts** (docs/28): the account field on each draft suggests the agency's existing accounts and the ones found in the PDF, so several posts land under the same account and visitors open the account to see them together;
   - choose which profile details to keep: the introduction, strengths, services, accounts (with their logos, which become the accounts' logos) and the page logo.
4. **Publish.**
   - Each kept draft is compressed in the browser (same as new posts) and published by `importPostAction`, which runs the same checks and image processing as a normal post.
   - A named client is matched to an existing portfolio client, or added.
   - `applyProfileImportAction` saves the accepted introduction, strengths and services, adds the clients with their logos, and sets the page logo.
   - Failures are shown on the draft, so the agency can fix them and publish again.

## Tested on a real portfolio

A 17-page agency portfolio exported as flat images (no text layer): the reader found 73 pictures in about 30 seconds on a laptop: 33 photos from four work grids, 19 client logos from two logo walls, 4 blocks and the 17 pages. The rules read cover, cover, about, six service pages, two client pages and six work pages; the introduction and eight services came from the OCR text. Numbers of that order are what to expect: OCR of stylised headings is partial, so titles and logo names are offered only when they read as words.

## Guards

- **Feature switch:** Admin → Features → "PDF portfolio import" (on by default).
- **Rate limit:** 6 readings per agency per hour, because readings can call the AI.
- **No platform cost by default:** rendering, layout and OCR run on the device; the server only receives text and small images, and calls the AI only when a key is configured.
- **Normal post rules:** the post limit for the agency's plan applies.
- **Content is data:** the model is told that PDF content is data, not instructions.
- **Audit:** each reading is logged (`portfolio_import.read`).
