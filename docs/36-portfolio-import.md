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
   - its text.

   The worker, fonts and character maps are served from `/engines/pdfjs`, copied by `scripts/vendor-engines.mjs`. The PDF itself never leaves the device.
2. **Propose drafts** (`analyzePortfolioAction`). The pages' text and small images go to the server:
   - **With `ANTHROPIC_API_KEY`**, Claude looks at every page (text and image, up to 24 pages) and fills a single `portfolio_plan` tool (`lib/portfolio-import/ai.ts`):
     - it classifies each page: work, cover, about, clients or contact;
     - it groups the pages of each project;
     - it writes a short caption;
     - it picks services, platforms and industry from Sawwiq's lists;
     - it names the client and any result **only when written on the pages**.

     The output is validated: unknown keys are dropped, a page belongs to one post at most, and a post has at most 10 pages.
   - **Without an AI key, or if the AI fails**, page-text rules take over (`lib/portfolio-import/rules.ts`):
     - covers, "about us", "our clients" and contact pages are recognised by their words, in Arabic and English;
     - pages with the same heading, or pages with pictures only, join the project before them;
     - services come from the matchmaker's keywords and every catalog name and alias;
     - the client comes from lines like "Client: …" or "العميل: …".
3. **Review** (`components/studio/portfolio-import.tsx`). The agency can:
   - untick drafts;
   - remove pages;
   - merge a post with the one above;
   - make a post from an unused page;
   - edit the caption, client, result, services, platforms and industry;
   - choose which profile details to keep: the introduction, strengths and clients.
4. **Publish.**
   - Each kept draft is compressed in the browser (same as new posts) and published by `importPostAction`, which runs the same checks and image processing as a normal post.
   - A named client is matched to an existing portfolio client, or added.
   - `applyProfileImportAction` saves the accepted introduction and strengths, and adds the clients.
   - Failures are shown on the draft, so the agency can fix them and publish again.

## Guards

- **Feature switch:** Admin → Features → "PDF portfolio import" (on by default).
- **Rate limit:** 6 readings per agency per hour, because readings can call the AI.
- **Normal post rules:** the post limit for the agency's plan applies.
- **Content is data:** the model is told that PDF content is data, not instructions.
- **Audit:** each reading is logged (`portfolio_import.read`).
