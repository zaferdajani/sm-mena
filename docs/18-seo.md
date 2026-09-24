# 18 — SEO: the OneClickConvert playbook applied to Sawwiq

The same path we took on OneClickConvert: first make every page honest and indexable, then give each page something of its own, then connect the pages, then measure. The full audit (42 techniques, Sawwiq's state per item, the plan) was done before this work; this page records what is in place and what only the owner can do.

## Rules we keep (from OneClickConvert)

1. **Derive, don't duplicate.** Canonical, hreflang, share cards and index rules come from one helper (`lib/seo.ts` `pageMeta()`); the sitemap, `llms.txt` and the pages use the same thresholds (`INDEX_MIN_SERVICE`, `INDEX_MIN_CITY`, `postIndexable`).
2. **A page is in search only if it has something of its own.** Demo agencies and their posts are `noindex` and left out of the sitemap. A service's hire page is indexed once a real agency offers it, a service-in-a-city page once two real agencies there do, a post once it has a real description (80+ characters).
3. **Arabic is written, never translated; language parity is absolute.** Every service has written Arabic and English copy (`data/hire-content.json`), and every key exists in both `messages/*.json` (a unit test enforces it).
4. **Search phrases, not catalogue names,** in titles, headings, breadcrumbs and link text (`searchPhrase()` / `serviceLinkText()` in `lib/hire-content.ts`).
5. **A crawler is not a visitor** (`lib/crawler.ts`): robots don't count as profile or post views, page views or error reports.
6. **Verify on the live host after each deploy:** `npm run seo:check -- https://sawwiq-jo.fly.dev`.

## What is in place

| Area | What | Where |
|---|---|---|
| Canonical + hreflang | Every public page: its own canonical, `ar`/`en`/`x-default` pairs; private pages no longer inherit the home page's pairs; next-intl's conflicting `Link` header is off | `lib/seo.ts`, `i18n/routing.ts` |
| Titles and descriptions | Fitted to the snippet (title ≈60, description ≈158, whole sentences, Arabic ؟ aware); brand last; keyword in every H1 | `fitTitle`, `fitDescription` |
| Home | «شركات التسويق الإلكتروني والسوشيال ميديا في الأردن \| سوّق», H1 with «في الأردن», Organization + WebSite JSON-LD, links to the 8 most searched services | `app/[locale]/(main)/page.tsx` |
| Hire pages | Search-phrase titles, written intro, "what's included", an honest "when it's not for you", price table from agencies' prices plus published packages, what moves the price, 2 service-specific FAQs + 2 about Sawwiq; ItemList (real agencies only), Service with AggregateOffer (real prices only), BreadcrumbList, FAQPage | `components/hire/hire-page.tsx` |
| Agency profiles | Title «{agency}: {service} في {city}», packages and latest reviews on the canonical URL, services link to their hire pages; ProfessionalService with AggregateRating from Sawwiq's verified reviews only (never Google's, never demo), offers from packages, BreadcrumbList | `app/[locale]/(main)/a/[handle]/page.tsx`, `lib/structured-data.ts` |
| Posts | One H1, description in the page's language, noindex when thin or demo | `app/[locale]/(main)/p/[id]/page.tsx` |
| Explore | One indexable page; filtered views are `noindex, follow` (the landing page for a service is `/hire/{service}`) | `explore/page.tsx` |
| Trust | About (verification, review rules, protected payments, demo accounts, how we make money) and Contact pages; footer on every page | `about/`, `contact/`, `components/shell/site-footer.tsx` |
| Share cards | 1200×630 JPEG per language (Arabic shaped correctly), `summary_large_image`, `og:url`, alternate locales | `public/og/`, `lib/seo.ts` |
| Sitemap | Each language its own entry with the full hreflang set, dates, no demo, no thin pages | `app/sitemap.ts` |
| robots.txt | Private areas blocked; search and AI answer engines named and welcome | `app/robots.ts` |
| llms.txt | Summary, facts, hire hubs and real agencies for AI answer engines | `app/llms.txt/route.ts` |
| 404 | Real 404 status in the visitor's language, with links to the hire hubs | `app/[locale]/not-found.tsx`, `[...rest]` |
| Other hosts | `X-Robots-Tag: noindex` on any host other than `NEXT_PUBLIC_SITE_URL` (fly.dev once a domain is live, previews) | `proxy.ts` |
| Switch | `SEO_INDEXABLE=false` keeps the whole site out of search (staging) | `.env.example` |
| IndexNow | Pings Bing/Yandex when a real agency publishes work or edits its page (set `INDEXNOW_KEY`) | `lib/indexnow.ts`, `/indexnow.txt` |
| Speed | Only the body font is preloaded (headings and numbers swap in) | `app/[locale]/layout.tsx` |

## Owner to-do (things code can't do)

1. **Pick the final domain before submitting to Google.** Rankings built on `sawwiq-jo.fly.dev` must later be moved with redirects. The legal copy already says `sawwiq.jo`. When it's live: set `NEXT_PUBLIC_SITE_URL` in the deploy workflow; the fly.dev host then answers with `noindex` automatically.
2. **Google Search Console and Bing Webmaster Tools:** verify the domain (DNS TXT is simplest, or set `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION`), submit `/sitemap.xml`, and request indexing for `/ar`, `/ar/hire` and the top hire pages.
3. **IndexNow:** add a secret `INDEXNOW_KEY` (32 hex characters, e.g. `openssl rand -hex 16`).
4. **Remove the demo agencies once real ones join** (Admin → Agencies). Until then almost only home, hire index, explore, about and contact are indexable, on purpose.
5. **Keep one machine always on** (`min_machines_running = 1` in `fly.toml`, a few dollars a month): a cold start took 13 s, which slows Google's crawling.
6. **Check the Jordan-specific facts in the service copy** before indexing: drone/archaeological-site permits (video), trademark registration at the Ministry of Industry, Trade and Supply (branding), JFDA Arabic labelling (packaging), municipality licences for outdoor ads and shop signs, `.jo` domain documents, CliQ and cash on delivery (e-commerce), LinkedIn minimum audience, WhatsApp template approval and per-conversation pricing.

## Keyword map (search phrase → owning page)

Volumes are unmeasured. Replace this list with Search Console data after about 60 days, as on OneClickConvert.

| Page | Arabic phrase | English phrase | Kind |
|---|---|---|---|
| `/` | شركات التسويق الإلكتروني والسوشيال ميديا في الأردن | social media & digital marketing agencies in Jordan | hub |
| `/hire` | شركات التسويق والسوشيال ميديا في الأردن حسب الخدمة | marketing and social media agencies in Jordan by service | hub |
| `/hire/smm_management` | إدارة حسابات السوشيال ميديا | social media management | remote |
| `/hire/smm_content` | صناعة محتوى وتصاميم سوشيال ميديا | social media content creation | remote |
| `/hire/smm_community` | إدارة رسائل وتعليقات السوشيال ميديا | community management | remote |
| `/hire/smm_strategy` | استراتيجية تسويق عبر السوشيال ميديا | social media strategy | remote |
| `/hire/smm_influencer` | التسويق عبر المؤثرين | influencer marketing | remote |
| `/hire/ads_meta` | إعلانات فيسبوك وإنستغرام الممولة | Facebook and Instagram ads | remote |
| `/hire/ads_tiktok` | إعلانات تيك توك | TikTok ads | remote |
| `/hire/ads_snapchat` | إعلانات سناب شات | Snapchat ads | remote |
| `/hire/ads_google` | إعلانات جوجل المدفوعة | Google Ads | remote |
| `/hire/ads_linkedin` | إعلانات لينكد إن | LinkedIn ads | remote |
| `/hire/video_production` | تصوير فيديو إعلاني وريلز | video production | on site |
| `/hire/photography` | تصوير منتجات وإعلانات | product photography | on site |
| `/hire/graphic_design` | التصميم الجرافيكي | graphic design | remote |
| `/hire/copywriting` | كتابة محتوى تسويقي | copywriting | remote |
| `/hire/motion_graphics` | تصميم فيديو موشن جرافيك | motion graphics | remote |
| `/hire/brand_identity` | تصميم هوية بصرية وشعار | logo and brand identity design | remote |
| `/hire/brand_strategy` | بناء استراتيجية العلامة التجارية | brand strategy | remote |
| `/hire/packaging_design` | تصميم تغليف وعلب منتجات | packaging design | remote |
| `/hire/seo` | السيو وتحسين محركات البحث | SEO | remote |
| `/hire/email_marketing` | التسويق عبر الواتساب والبريد الإلكتروني | WhatsApp and email marketing | remote |
| `/hire/web_design` | تصميم مواقع إلكترونية | website design | remote |
| `/hire/analytics` | تحليل بيانات التسويق والتقارير | marketing analytics and reporting | remote |
| `/hire/web_maintenance` | صيانة واستضافة المواقع | website maintenance and hosting | remote |
| `/hire/ecommerce_setup` | إنشاء متجر إلكتروني | online store setup | remote |
| `/hire/event_coverage` | تصوير وتغطية الفعاليات | event photography and videography | on site |
| `/hire/print_design` | تصميم وطباعة المطبوعات | print design and printing | remote |
| `/hire/outdoor_ads` | إعلانات الطرق واللوحات الإعلانية | billboard and outdoor advertising | on site |
| `/hire/activations` | تنظيم فعاليات وتفعيلات تسويقية | brand activation | on site |

City pages (`/hire/{service}/{city}`) take «… في عمّان/إربد/الزرقاء…» and are indexed once two real agencies in that city offer the service; the city matters most for on-site services.

## Measuring (weekly, in this order)

1. Indexed pages (Search Console → Pages).
2. Impressions by group: home, hire services, hire cities, agencies.
3. Clicks.
4. Sites linking to Sawwiq.

Then join with what happens on the site (inquiries and project requests per landing page) to see which pages bring customers, not just clicks.
