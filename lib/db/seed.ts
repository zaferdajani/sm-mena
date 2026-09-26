// Seeds a local database with clearly fictional demo agencies.
//   npm run db:seed            seed if empty
//   npm run db:seed -- --reset wipe everything first
//   npm run db:seed -- --admin-only   only ensure the SEED_ADMIN_* account exists
// Demo agencies carry is_demo=true so they can be removed before launch
// (Admin → Agencies → "Remove demo data").
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { countryOf, countryOfCity } from "../countries";
import { updateAgency, createAgency } from "../data/agencies";
import { saveClient } from "../data/portfolio-clients";
import { syncServiceCatalog } from "../services/tags";
import { createPostFromProcessed } from "../data/posts";
import { normalizeForSearch } from "../text";
import { createProjectRequest } from "../data/requests";
import { ensureOwner, recoverOwner } from "../data/staff";
import { createUser, getUserByEmail } from "../data/users";
import { processAvatar, processImage, newAvatarKey } from "../images";
import { storage } from "../storage";
import { closeDb, getDb } from "./index";
import { demoAvatar, demoImage, rng, type DemoKind } from "./demo-images";
import { DEMO_REQUESTS, PORTFOLIO_CAPTIONS, SAUDI_DEMO_AGENCIES } from "./demo-portfolio";
import { DEMO_PROFILES, DEMO_ROLES } from "./demo-profiles";
import { DEMO_TRANSLATIONS } from "./demo-translations";
import { ROLE_KEYS } from "../services/catalog";
import { agencies, appSettings, events, follows, inquiries, likes, packages, posts, projectRequests, promotions, reviews, saves, type DeliverableLine } from "./schema";

export const DEMO_PASSWORD = "demo-pass-123";

type DemoAgency = {
  handle: string;
  name: string;
  bio: string;
  city: string;
  services: string[];
  platforms: string[];
  industries: string[];
  price: number;
  verified: boolean;
  founded: number;
  team: string;
  // Optional, for specialised agencies: their own post headlines/captions, packages and client reviews.
  headlines?: string[];
  captions?: string[];
  packages?: { title: string; service: string; priceJod: number; items: DeliverableLine[]; deliverables?: string[]; deliveryDays?: number }[];
  reviews?: [string, string, string][];
};

// Fictional names. Any resemblance to a real agency is unintended.
export const DEMO_AGENCIES: DemoAgency[] = [
  { handle: "nakhla.studio", name: "استوديو نخلة", bio: "محتوى سوشيال ميديا للمطاعم والمقاهي في عمّان. تصوير، ريلز، وإدارة حسابات.", city: "amman", services: ["smm_management", "smm_content", "video_production"], platforms: ["instagram", "tiktok"], industries: ["restaurant_cafe"], price: 250, verified: true, founded: 2019, team: "6-15" },
  { handle: "petra.growth", name: "Petra Growth", bio: "Performance marketing for e-commerce. Meta and TikTok ads that pay for themselves.", city: "amman", services: ["ads_meta", "ads_tiktok", "analytics"], platforms: ["instagram", "facebook", "tiktok"], industries: ["ecommerce", "retail_shop"], price: 400, verified: true, founded: 2017, team: "16-40" },
  { handle: "sahel.media", name: "ساحل ميديا", bio: "إدارة حسابات وحملات إعلانية للعيادات والمراكز الطبية.", city: "irbid", services: ["smm_management", "ads_meta", "copywriting"], platforms: ["instagram", "facebook"], industries: ["clinic_health", "beauty_fitness"], price: 180, verified: false, founded: 2021, team: "2-5" },
  { handle: "aqaba.waves", name: "Aqaba Waves", bio: "Tourism and hospitality content from the Red Sea. Drone, photo and short-form video.", city: "aqaba", services: ["video_production", "photography", "smm_content"], platforms: ["instagram", "youtube", "tiktok"], industries: ["tourism_hospitality"], price: 300, verified: true, founded: 2018, team: "6-15" },
  { handle: "zaytoon.brand", name: "زيتون للهوية", bio: "هويات بصرية واستراتيجية علامة تجارية للمشاريع الناشئة.", city: "amman", services: ["brand_identity", "brand_strategy", "graphic_design"], platforms: ["instagram", "linkedin"], industries: ["professional_services", "ecommerce"], price: 350, verified: true, founded: 2016, team: "6-15" },
  { handle: "reel.house.jo", name: "Reel House", bio: "Reels and TikToks that stop the scroll. UGC, creators and influencer campaigns.", city: "amman", services: ["video_production", "smm_influencer", "ads_tiktok"], platforms: ["tiktok", "instagram", "snapchat"], industries: ["beauty_fitness", "restaurant_cafe", "retail_shop"], price: 450, verified: false, founded: 2022, team: "2-5" },
  { handle: "zarqa.digital", name: "زرقاء ديجيتال", bio: "تسويق رقمي بأسعار مناسبة للمحلات والشركات الصغيرة في الزرقاء.", city: "zarqa", services: ["smm_management", "graphic_design", "ads_meta"], platforms: ["facebook", "instagram"], industries: ["retail_shop", "manufacturing"], price: 120, verified: false, founded: 2020, team: "2-5" },
  { handle: "linked.levant", name: "Levant B2B", bio: "LinkedIn content and ads for B2B, education and professional services.", city: "amman", services: ["ads_linkedin", "smm_strategy", "copywriting"], platforms: ["linkedin"], industries: ["professional_services", "education"], price: 500, verified: true, founded: 2015, team: "6-15" },
  { handle: "snap.souq", name: "سناب سوق", bio: "حملات سناب شات وتيك توك للمتاجر الإلكترونية. نتائج تقاس بالمبيعات.", city: "amman", services: ["ads_snapchat", "ads_tiktok", "ads_meta"], platforms: ["snapchat", "tiktok"], industries: ["ecommerce"], price: 300, verified: false, founded: 2021, team: "6-15" },
  { handle: "salt.stories", name: "Salt Stories", bio: "Storytelling for NGOs, heritage and education projects.", city: "salt", services: ["smm_content", "video_production", "smm_strategy"], platforms: ["facebook", "instagram", "youtube"], industries: ["ngo", "education"], price: 220, verified: true, founded: 2019, team: "2-5" },
  { handle: "madaba.pixels", name: "مادبا بكسلز", bio: "تصوير منتجات وتصميم منشورات للمتاجر والمطاعم.", city: "madaba", services: ["photography", "graphic_design", "smm_content"], platforms: ["instagram", "facebook"], industries: ["restaurant_cafe", "retail_shop"], price: 150, verified: false, founded: 2023, team: "1" },
  { handle: "search.first.jo", name: "Search First", bio: "SEO, Google Ads and websites that bring customers from search.", city: "amman", services: ["seo", "ads_google", "web_design"], platforms: ["google"], industries: ["real_estate", "clinic_health", "professional_services"], price: 350, verified: true, founded: 2014, team: "16-40" },
  {
    handle: "shifa.digital",
    name: "شفاء ديجيتال",
    bio: "تسويق طبي للعيادات ومراكز الأسنان والصيدليات والعلاج الطبيعي: حجوزات عبر جوجل وميتا، فيديوهات يقدمها الأطباء، وإدارة التقييمات، بما يتوافق مع تعليمات وزارة الصحة والنقابات.",
    city: "amman",
    services: ["ads_google", "smm_management", "video_production", "seo"],
    platforms: ["google", "instagram", "facebook"],
    industries: ["clinic_health"],
    price: 320,
    verified: true,
    founded: 2018,
    team: "6-15",
    headlines: ["احجز موعدك", "Book online", "عيادة الأسنان", "Meet the doctor", "توصيل الصيدلية", "+62% bookings"],
    captions: [
      "حملة حجوزات لعيادة أسنان في عبدون: إعلانات جوجل، تحسين خرائط جوجل، ومتابعة عبر واتساب.",
      "Doctor-led Reels for a dermatology clinic: three videos a week, every script reviewed by the medical team.",
      "إطلاق خدمة التوصيل لصيدلية في إربد عبر إعلانات ميتا وطلبات واتساب.",
      "Physiotherapy centre: explainer videos and a booking funnel. +62% bookings in 60 days.",
      "تحسين ظهور مركز طبي على جوجل: صفحات للخدمات، تقييمات المرضى، وموقع أسرع.",
    ],
    packages: [
      {
        title: "باقة العيادة",
        service: "smm_management",
        priceJod: 320,
        items: [
          { key: "account_management", quantity: 1, platform: "instagram" },
          { key: "reels", quantity: 8, platform: "instagram" },
          { key: "community_replies", quantity: 1, platform: "facebook" },
          { key: "monthly_report", quantity: 1 },
        ],
        deliverables: ["يراجع الطبيب كل محتوى قبل نشره"],
        deliveryDays: 30,
      },
      {
        title: "Bookings Growth",
        service: "ads_google",
        priceJod: 550,
        items: [
          { key: "ad_campaigns", quantity: 2, platform: "google" },
          { key: "ad_campaigns", quantity: 1, platform: "instagram" },
          { key: "seo_optimization", quantity: 1 },
          { key: "monthly_report", quantity: 1 },
        ],
        deliverables: ["Google Business Profile and reviews set up"],
        deliveryDays: 30,
      },
    ],
    reviews: [
      ["د. لينا", "عيادة بسمة لطب الأسنان", "تضاعفت الحجوزات من جوجل خلال شهرين، والمحتوى كان دقيقاً طبياً ومحترماً للمرضى."],
      ["Dr. Hani", "Irbid Physio Centre", "They understood medical advertising rules and our patients' concerns. Clear weekly reports."],
      ["مها", "صيدلية الريحان", "حملة التوصيل عبر واتساب رفعت الطلبات بشكل واضح، وفريقهم سريع في الرد."],
    ],
  },
  // Gulf and Egypt (prices in each country's currency, a month).
  { handle: "najd.creative", name: "نجد كريتيف", bio: "إدارة حسابات ومحتوى وإعلانات سناب شات وتيك توك للعلامات السعودية في الرياض.", city: "riyadh", services: ["smm_management", "smm_content", "ads_snapchat", "ads_tiktok"], platforms: ["snapchat", "tiktok", "instagram", "x"], industries: ["restaurant_cafe", "retail_shop", "ecommerce"], price: 3500, verified: true, founded: 2018, team: "16-40" },
  { handle: "jeddah.growth", name: "Jeddah Growth", bio: "One team from brand to performance: identity, content and paid media for Saudi brands.", city: "jeddah", services: ["brand_identity", "smm_content", "ads_meta", "ads_google", "analytics"], platforms: ["instagram", "google", "tiktok"], industries: ["ecommerce", "real_estate", "professional_services"], price: 5000, verified: true, founded: 2016, team: "16-40" },
  { handle: "dubai.loop", name: "Dubai Loop", bio: "Content studio and paid social for hospitality and lifestyle brands in Dubai.", city: "dubai", services: ["video_production", "smm_content", "ads_meta", "brand_identity"], platforms: ["instagram", "tiktok", "youtube"], industries: ["tourism_hospitality", "restaurant_cafe", "beauty_fitness"], price: 6000, verified: true, founded: 2017, team: "16-40" },
  { handle: "capital.b2b.ae", name: "Capital B2B", bio: "LinkedIn, SEO and thought-leadership content for B2B firms in Abu Dhabi.", city: "abu_dhabi", services: ["ads_linkedin", "seo", "copywriting", "smm_strategy"], platforms: ["linkedin", "google"], industries: ["professional_services", "education"], price: 5500, verified: false, founded: 2019, team: "6-15" },
  { handle: "gulf.pixel.kw", name: "بكسل الخليج", bio: "تصوير منتجات ومحتوى سناب شات وإنستغرام للمتاجر والمطاعم في الكويت.", city: "kuwait_city", services: ["photography", "smm_content", "ads_snapchat"], platforms: ["snapchat", "instagram"], industries: ["restaurant_cafe", "retail_shop"], price: 250, verified: true, founded: 2020, team: "2-5" },
  { handle: "doha.frame", name: "Doha Frame", bio: "Event coverage, video production and social media for Qatar's venues and brands.", city: "doha", services: ["video_production", "event_coverage", "smm_management"], platforms: ["instagram", "youtube", "tiktok"], industries: ["tourism_hospitality", "education"], price: 4000, verified: true, founded: 2018, team: "6-15" },
  { handle: "manama.social", name: "منامة سوشيال", bio: "إدارة حسابات وتصميم وإعلانات ميتا للشركات الصغيرة والمتوسطة في البحرين.", city: "manama", services: ["smm_management", "graphic_design", "ads_meta"], platforms: ["instagram", "facebook"], industries: ["retail_shop", "clinic_health"], price: 200, verified: false, founded: 2021, team: "2-5" },
  { handle: "muscat.media", name: "مسقط ميديا", bio: "محتوى وتصوير وإعلانات للسياحة والضيافة والمطاعم في عُمان.", city: "muscat", services: ["smm_management", "photography", "ads_meta"], platforms: ["instagram", "tiktok"], industries: ["tourism_hospitality", "restaurant_cafe"], price: 250, verified: true, founded: 2019, team: "6-15" },
  { handle: "nile.digital", name: "نايل ديجيتال", bio: "فريق متكامل: هوية بصرية ومحتوى وإعلانات ممولة للعلامات المصرية في القاهرة.", city: "cairo", services: ["brand_identity", "smm_management", "smm_content", "ads_meta"], platforms: ["facebook", "instagram", "tiktok"], industries: ["ecommerce", "retail_shop", "real_estate"], price: 12000, verified: true, founded: 2015, team: "16-40" },
  { handle: "alex.reels", name: "Alex Reels", bio: "Reels, TikToks and creator campaigns from Alexandria for Egyptian brands.", city: "alexandria", services: ["video_production", "ads_tiktok", "smm_influencer"], platforms: ["tiktok", "instagram"], industries: ["beauty_fitness", "restaurant_cafe"], price: 8000, verified: false, founded: 2022, team: "2-5" },
  // More Saudi agencies for testing the multi-country interface city by city.
  ...SAUDI_DEMO_AGENCIES,
];

const PORTFOLIO_DIR = path.join(process.cwd(), "data", "demo-portfolio");
const PORTFOLIO_FLAG = "demo_portfolio_v1";

/**
 * Real-looking portfolio posts (Higgsfield photos in data/demo-portfolio) for
 * every demo agency, newest in its feed. Runs once per database (flag in
 * app_settings), so existing deployments get them on the next boot too.
 */
async function addDemoPortfolio(log: (...a: unknown[]) => void) {
  const db = await getDb();
  const [done] = await db.select().from(appSettings).where(eq(appSettings.key, PORTFOLIO_FLAG));
  if (done || !existsSync(PORTFOLIO_DIR)) return;
  const demos = await db
    .select({ id: agencies.id, handle: agencies.handle, services: agencies.services, platforms: agencies.platforms, industries: agencies.industries })
    .from(agencies)
    .where(eq(agencies.isDemo, true));
  let added = 0;
  const now = Date.now();
  for (const [i, a] of demos.entries()) {
    const captions = PORTFOLIO_CAPTIONS[a.handle] ?? [];
    const files = [1, 2, 3].map((n) => path.join(PORTFOLIO_DIR, `${a.handle}-${n}.webp`));
    // Encoded side by side: each image runs its own quality search (lib/images.ts).
    const encoded = await Promise.all(files.map((file) => (existsSync(file) ? processImage(readFileSync(file)) : null)));
    for (let n = 1; n <= 3; n++) {
      const processed = encoded[n - 1];
      if (!processed) continue;
      await createPostFromProcessed(
        a.id,
        {
          caption: captions[n - 1] ?? "",
          services: [a.services[(n - 1) % a.services.length]].filter(Boolean),
          platforms: a.platforms.length ? [a.platforms[(n - 1) % a.platforms.length]] : [],
          industry: a.industries[(n - 1) % Math.max(1, a.industries.length)] ?? null,
          result: null,
        },
        [processed],
        new Date(now - (n * 5 + i) * 3600 * 1000),
      );
      added++;
    }
  }
  await db.insert(appSettings).values({ key: PORTFOLIO_FLAG, value: true }).onConflictDoNothing();
  log(`Added ${added} portfolio posts to demo agencies.`);
}

const PROFILES_FLAG = "demo_profiles_v1";

/** Introductions, strengths, countries served and portfolio clients for demo agencies (lib/db/demo-profiles.ts). */
async function addDemoProfiles(log: (...a: unknown[]) => void) {
  const db = await getDb();
  const [done] = await db.select().from(appSettings).where(eq(appSettings.key, PROFILES_FLAG));
  if (done) return;
  let clients = 0;
  for (const [handle, p] of Object.entries(DEMO_PROFILES)) {
    const [agency] = await db.select({ id: agencies.id, country: agencies.country }).from(agencies).where(and(eq(agencies.handle, handle), eq(agencies.isDemo, true)));
    if (!agency) continue;
    await db
      .update(agencies)
      .set({ about: p.about, strengths: p.strengths, servesCountries: (p.serves ?? []).filter((c) => c !== agency.country) })
      .where(eq(agencies.id, agency.id));
    const recent = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.agencyId, agency.id), isNull(posts.clientId))).orderBy(desc(posts.createdAt));
    let next = 0;
    for (const c of p.clients ?? []) {
      const saved = await saveClient(agency.id, null, c);
      if (!("ok" in saved)) continue;
      clients++;
      const tagged = recent.slice(next, next + c.posts).map((r) => r.id);
      next += c.posts;
      if (tagged.length) await db.update(posts).set({ clientId: saved.id }).where(inArray(posts.id, tagged));
    }
  }
  await db.insert(appSettings).values({ key: PROFILES_FLAG, value: true }).onConflictDoNothing();
  log(`Added demo introductions and ${clients} portfolio clients.`);
}

const ROLES_FLAG = "demo_roles_v1";

/** Team roles, roles sought and freelancers among demo agencies (partners, docs/30). */
async function addDemoRoles(log: (...a: unknown[]) => void) {
  const db = await getDb();
  const [done] = await db.select().from(appSettings).where(eq(appSettings.key, ROLES_FLAG));
  if (done) return;
  let n = 0;
  for (const [handle, r] of Object.entries(DEMO_ROLES)) {
    const team = r.team.filter((x) => ROLE_KEYS.includes(x));
    const rows = await db
      .update(agencies)
      .set({ kind: r.kind ?? "agency", teamRoles: team, seeksRoles: (r.seeks ?? []).filter((x) => ROLE_KEYS.includes(x)) })
      .where(and(eq(agencies.handle, handle), eq(agencies.isDemo, true)))
      .returning({ id: agencies.id });
    n += rows.length;
  }
  await db.insert(appSettings).values({ key: ROLES_FLAG, value: true }).onConflictDoNothing();
  log(`Added team roles to ${n} demo agencies.`);
}

const TRANSLATIONS_FLAG = "demo_translations_v1";

/** English versions of the demo agencies that write in Arabic, and of their posts' captions (lib/db/demo-translations.ts). */
async function addDemoTranslations(log: (...a: unknown[]) => void) {
  const db = await getDb();
  const [done] = await db.select().from(appSettings).where(eq(appSettings.key, TRANSLATIONS_FLAG));
  if (done) return;
  let agencyCount = 0;
  let postCount = 0;
  for (const [handle, tr] of Object.entries(DEMO_TRANSLATIONS)) {
    const [agency] = await db
      .update(agencies)
      .set({
        contentLang: "ar",
        translation: { name: tr.name, bio: tr.bio, ...(tr.about ? { about: tr.about } : {}), ...(tr.strengths ? { strengths: tr.strengths } : {}) },
        // Search finds them by their English name and bio too.
        searchText: sql`${agencies.searchText} || ' ' || ${normalizeForSearch(`${tr.name} ${tr.bio}`)}`,
      })
      .where(and(eq(agencies.handle, handle), eq(agencies.isDemo, true)))
      .returning({ id: agencies.id });
    if (!agency) continue;
    agencyCount++;
    for (const [ar, en] of Object.entries(tr.captions)) {
      const rows = await db
        .update(posts)
        .set({ translation: { caption: en }, searchText: sql`${posts.searchText} || ' ' || ${normalizeForSearch(`${en} ${tr.name}`)}` })
        .where(and(eq(posts.agencyId, agency.id), eq(posts.caption, ar)))
        .returning({ id: posts.id });
      postCount += rows.length;
    }
  }
  await db.insert(appSettings).values({ key: TRANSLATIONS_FLAG, value: true }).onConflictDoNothing();
  log(`Added English to ${agencyCount} demo agencies and ${postCount} posts.`);
}

/** Keeps a few open demo client requests (they expire after 14 days) so the agency request feed is never empty. */
async function addDemoRequests(log: (...a: unknown[]) => void) {
  const db = await getDb();
  const [{ open }] = (await db
    .select({ open: sql<number>`count(*)::int` })
    .from(projectRequests)
    .where(and(eq(projectRequests.source, "demo"), eq(projectRequests.status, "open"), gt(projectRequests.expiresAt, new Date())))) as { open: number }[];
  if (open > 0) return;
  const demos = await db.select({ id: agencies.id, country: agencies.country, services: agencies.services }).from(agencies).where(eq(agencies.isDemo, true));
  for (const [i, d] of DEMO_REQUESTS.entries()) {
    const matches = demos
      .filter((a) => a.country === d.country)
      .map((a) => ({ agencyId: a.id, score: 50 + 10 * a.services.filter((s) => d.services.includes(s)).length }))
      .filter((m) => m.score > 50)
      .sort((x, y) => y.score - x.score);
    await createProjectRequest(
      {
        clientName: d.clientName,
        phone: `+${countryOf(d.country).dial}5000000${String(i).padStart(2, "0")}`,
        businessName: d.businessName,
        businessType: d.businessType,
        services: d.services,
        platforms: d.platforms,
        city: d.city,
        country: d.country,
        budgetMinJod: d.budget[0],
        budgetMaxJod: d.budget[1],
        timeline: d.timeline,
        description: d.description,
        source: "demo",
        visitorId: `demo-client-${i}`,
      },
      matches,
    );
  }
  log(`Added ${DEMO_REQUESTS.length} open demo client requests.`);
}

/** A fictional number in the agency's own country (Jordan keeps its old demo numbers). */
function demoPhone(city: string, index: number) {
  const code = countryOfCity(city) ?? "jo";
  const digits = String(1000000 + index * 7919).slice(0, 7);
  return code === "jo" ? `+96279${digits}` : `+${countryOf(code).dial}5${digits}`;
}

const HEADLINES: Record<DemoKind, string[]> = {
  ad: ["-30% اليوم فقط", "NEW DROP", "اطلب الآن", "Limited offer"],
  content: ["قائمة الشتاء", "Behind the scenes", "نصيحة اليوم", "Meet the team"],
  video: ["Reel · 0:24", "ريلز جديد", "UGC · 0:15", "Drone · 0:30"],
  branding: ["Brand refresh", "هوية جديدة", "Logo system", "Type & colour"],
  photo: ["Product shoot", "جلسة تصوير", "Menu shoot", "Lookbook"],
  results: ["+180% reach", "3.2x ROAS", "+45% leads", "-38% CPA"],
};

const CAPTIONS = [
  "حملة إطلاق لمدة ٣٠ يوماً: محتوى يومي وإعلانات موجّهة لسكان عمّان.",
  "Monthly content calendar: 12 posts, 8 stories and 4 reels.",
  "إعادة تصميم هوية الحساب بالكامل مع قوالب ثابتة للمنشورات.",
  "Ramadan campaign with creators and paid social. Results in the last slide.",
  "تصوير منتجات بخلفية بيضاء ونمط حياة للموقع والإنستغرام.",
  "From 2k to 18k followers in four months with organic reels.",
];

const RESULTS = ["+180% reach in 30 days", "3.2x return on ad spend", "+45% leads", "18k new followers", null, null];

function kindFor(service: string): DemoKind {
  if (service.startsWith("ads_") || service === "seo" || service === "analytics") return "results";
  if (service === "video_production" || service === "smm_influencer") return "video";
  if (service.startsWith("brand") || service === "graphic_design") return "branding";
  if (service === "photography") return "photo";
  if (service === "smm_content" || service === "copywriting") return "content";
  return "ad";
}

async function reset() {
  const db = await getDb();
  await db.execute(sql`truncate table staff_invites, app_settings, contract_events, escrow_ledger, milestone_checks, milestones, contracts, payment_events, payments, error_events, support_requests, page_views, audit_logs, events, reports, promotions, proposals, request_matches, project_requests, reviews, review_requests, packages, inquiries, follows, saves, likes, post_images, posts, agencies, sessions, users restart identity cascade`);
}

export async function seed({ reset: doReset = false, quiet = false, adminOnly = false, restoreDemo = false } = {}) {
  const log = quiet ? () => {} : console.log;
  const db = await getDb();
  if (doReset) await reset();
  // Every built-in service gets its numbered tag (data/service-catalog.json).
  await syncServiceCatalog();
  const production = process.env.NODE_ENV === "production";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? (production ? null : "admin@sawwiq.test");
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? (production ? null : "admin-pass-123");
  // The admin is ensured on every run, so secrets added after the first deploy still work.
  if (adminEmail && adminPassword && (!production || adminPassword.length >= 12)) {
    if (!(await getUserByEmail(adminEmail))) {
      await createUser(adminEmail, adminPassword, "admin");
      log(`Admin account created for ${adminEmail}.`);
    }
  } else {
    log("No admin created: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters in production).");
  }
  // The platform always has exactly one owner (see lib/data/staff.ts).
  const owner = await ensureOwner(adminEmail ?? undefined);
  if (owner) log(`${owner} is the platform owner.`);
  // Break-glass (docs/17-team-access.md): remove the secret again after signing in.
  if (process.env.OWNER_RECOVERY_EMAIL) {
    const done = await recoverOwner(process.env.OWNER_RECOVERY_EMAIL, process.env.OWNER_RECOVERY_PASSWORD);
    log(done ? "Owner recovery applied: two-factor sign-in cleared. Remove OWNER_RECOVERY_* now." : "OWNER_RECOVERY_EMAIL is not the owner; nothing changed.");
  }
  if (adminOnly) return;

  const [{ n, demo: demoCount }] = (await db
    .select({ n: sql<number>`count(*)::int`, demo: sql<number>`count(*) filter (where ${agencies.isDemo})::int` })
    .from(agencies)) as { n: number; demo: number }[];
  const [removedFlag] = await db.select().from(appSettings).where(sql`${appSettings.key} = 'demo_removed'`);
  if (removedFlag && !doReset) {
    log("Demo data was removed by an admin; not adding it back. Use --reset to start over.");
    return;
  }
  const fresh = n === 0;
  // An existing database with demo data gets any demo agencies added since it
  // was seeded. Once an admin removes the demo data, nothing is added back.
  // restoreDemo: lib/db/rebuild-demo-media.ts re-creates demo agencies it removed.
  if (!fresh && demoCount === 0 && !restoreDemo) {
    log(`Database already has ${n} agencies and no demo data. Use --reset to start over.`);
    return;
  }
  const existing = new Set((await db.select({ handle: agencies.handle }).from(agencies)).map((a) => a.handle));
  const toCreate = [...DEMO_AGENCIES.entries()].filter(([, d]) => !existing.has(d.handle));
  if (!toCreate.length) {
    await addDemoPortfolio(log);
    await addDemoProfiles(log);
    await addDemoRoles(log);
    await addDemoTranslations(log);
    await addDemoRequests(log);
    log(`Database already has ${n} agencies. Use --reset to start over.`);
    return;
  }

  // Demo agency accounts must not share a known password on a public deployment.
  const demoPassword =
    process.env.SEED_DEMO_PASSWORD ?? (production ? randomBytes(18).toString("base64url") : DEMO_PASSWORD);

  const now = Date.now();
  const r = rng(42);
  const postIds: string[] = [];
  const agencyIds: string[] = [];
  const createdIndex: number[] = []; // DEMO_AGENCIES index for each created agency

  for (const [index, demo] of toCreate) {
    const email = `${demo.handle.replace(/\./g, "-")}@sawwiq.test`;
    const user = (await getUserByEmail(email)) ?? (await createUser(email, demoPassword));
    const agency = await createAgency(
      user.id,
      {
        handle: demo.handle,
        name: demo.name,
        bio: demo.bio,
        city: demo.city,
        services: demo.services,
        platforms: demo.platforms,
        industries: demo.industries,
        languages: ["ar", "en"],
        startingPriceJod: demo.price,
        whatsapp: demoPhone(demo.city, index),
        phone: demoPhone(demo.city, index),
        email: `hello@${demo.handle.replace(/\./g, "-")}.example`,
        website: `https://${demo.handle.replace(/\./g, "-")}.example`,
        instagram: demo.handle.replace(/\./g, "_"),
        foundedYear: demo.founded,
        teamSize: demo.team,
      },
      { isVerified: demo.verified, isDemo: true },
    );
    agencyIds.push(agency.id);
    createdIndex.push(index);

    const initials = demo.name.replace(/[^A-Za-z؀-ۿ ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const avatarKey = newAvatarKey(agency.id);
    await storage().put(avatarKey, await processAvatar(await demoAvatar(initials, index + 1)), "image/webp");
    await updateAgency(agency.id, { avatarKey });

    const postTotal = 4 + Math.floor(r() * 4);
    for (let p = 0; p < postTotal; p++) {
      const service = demo.services[p % demo.services.length];
      const kind = kindFor(service);
      const imageCount = 1 + Math.floor(r() * 3);
      const sources = [];
      for (let i = 0; i < imageCount; i++) {
        const pool = demo.headlines ?? HEADLINES[kind];
        const headline = pool[Math.floor(r() * pool.length)];
        const tall = p % 3 === 1;
        sources.push(demoImage(i === imageCount - 1 && imageCount > 1 ? "results" : kind, index * 100 + p * 10 + i, headline, `@${demo.handle}`, tall));
      }
      // Encoded side by side: each image runs its own quality search (lib/images.ts).
      const processed = await Promise.all(sources.map(async (source) => processImage(await source)));
      const post = await createPostFromProcessed(
        agency.id,
        {
          caption: (demo.captions ?? CAPTIONS)[Math.floor(r() * (demo.captions ?? CAPTIONS).length)],
          services: [service, ...(r() > 0.6 ? [demo.services[(p + 1) % demo.services.length]] : [])].filter((v, i, a) => a.indexOf(v) === i),
          platforms: [demo.platforms[p % demo.platforms.length]],
          industry: demo.industries[p % demo.industries.length],
          result: RESULTS[Math.floor(r() * RESULTS.length)],
        },
        processed,
        new Date(now - Math.floor(r() * 60 * 24 * 3600 * 1000)),
      );
      postIds.push(post.id);
    }
    log(`  ${demo.handle}: ${postTotal} posts`);
  }

  // A little activity so insights and counters are not empty.
  const visitors = Array.from({ length: 40 }, (_, i) => `demo-visitor-${i}`);
  for (const postId of postIds) {
    const likers = visitors.filter(() => r() > 0.7);
    if (likers.length) await db.insert(likes).values(likers.map((visitorId) => ({ postId, visitorId })));
    const savers = likers.filter(() => r() > 0.6);
    if (savers.length) await db.insert(saves).values(savers.map((visitorId) => ({ postId, visitorId })));
  }
  await db.execute(sql`update posts set like_count = (select count(*) from likes l where l.post_id = posts.id), save_count = (select count(*) from saves s where s.post_id = posts.id), view_count = 20 + floor(random() * 400)::int`);
  for (const agencyId of agencyIds) {
    const followers = visitors.filter(() => r() > 0.65);
    if (followers.length) await db.insert(follows).values(followers.map((visitorId) => ({ agencyId, visitorId })));
    const eventRows = [];
    for (let d = 0; d < 30; d++) {
      const at = new Date(now - d * 24 * 3600 * 1000);
      const views = Math.floor(r() * 12);
      for (let v = 0; v < views; v++) eventRows.push({ type: "profile_view" as const, agencyId, createdAt: at, visitorId: visitors[v] });
      if (r() > 0.55) eventRows.push({ type: "contact_click" as const, agencyId, channel: "whatsapp" as const, createdAt: at, visitorId: visitors[d] });
      if (r() > 0.85) eventRows.push({ type: "contact_click" as const, agencyId, channel: "phone" as const, createdAt: at, visitorId: visitors[d] });
    }
    if (eventRows.length) await db.insert(events).values(eventRows);
  }
  await db.execute(sql`update agencies set follower_count = (select count(*) from follows f where f.agency_id = agencies.id)`);

  if (fresh) await db.insert(inquiries).values([
    { agencyId: agencyIds[0], name: "سارة", phone: "+962790000001", businessName: "مقهى الياسمين", service: "smm_management", message: "نبحث عن إدارة حساب إنستغرام لمقهى جديد في جبل عمّان. ما هي الباقات المتاحة؟", consentVersion: "2026-09" },
    { agencyId: agencyIds[1], name: "Omar", phone: "+962790000002", businessName: "Desert Threads", service: "ads_meta", message: "We sell clothing online and want to scale Meta ads. Budget around 800 JOD a month.", consentVersion: "2026-09" },
  ]);

  // Demo packages and client reviews (demo agencies only; removable with them).
  const REVIEW_TEXTS = [
    ["سارة", "مقهى الورد", "فريق محترف جداً، التزموا بالمواعيد وتضاعف التفاعل على حسابنا خلال شهرين."],
    ["Omar", "Desert Threads", "Clear reporting every week and our cost per sale dropped by a third. Would hire again."],
    ["لينا", "عيادة بسمة", "التواصل ممتاز والمحتوى مناسب لجمهورنا. نتمنى سرعة أكبر في التعديلات."],
    ["Khaled", "Levant Tours", "Great creative ideas and solid execution on our Reels. Pricing was fair for the quality."],
    ["رنا", "متجر رنا", "نتائج جيدة في الإعلانات لكن احتجنا لمتابعة أكثر في البداية."],
    ["Yousef", "Amman Realty", "Professional team that understood the Jordanian market. Leads improved quickly."],
  ];
  for (const [i2, agencyId] of agencyIds.entries()) {
    const index = createdIndex[i2];
    const demo = DEMO_AGENCIES[index];
    const pkgRows = demo.packages
      ? demo.packages.map((p, i) => ({ agencyId, service: p.service, title: p.title, description: "", priceJod: p.priceJod, billing: "monthly" as const, deliverables: p.deliverables ?? [], items: p.items, deliveryDays: p.deliveryDays ?? null, position: i }))
      : demo.services.slice(0, 2).map((service, i) => ({
      agencyId,
      service,
      title: i === 0 ? (demo.handle.includes(".") && /[a-z]/.test(demo.name) ? "Starter" : "الباقة الأساسية") : (/[a-z]/i.test(demo.name) ? "Growth" : "باقة النمو"),
      description: "",
      priceJod: i === 0 ? demo.price : demo.price * 2,
      billing: "monthly" as const,
      deliverables: i === 0 ? ["12 posts", "8 stories", "Monthly report"] : ["20 posts", "4 Reels", "Paid ads management", "Weekly report"],
      position: i,
    }));
    await db.insert(packages).values(pkgRows);
    const reviewTexts = demo.reviews ?? REVIEW_TEXTS;
    const count = 2 + Math.floor(r() * 4);
    let sum = 0;
    const rows = [];
    for (let k = 0; k < count; k++) {
      const [name, business, body] = reviewTexts[(index + k) % reviewTexts.length];
      const rating = r() > 0.25 ? 5 : r() > 0.4 ? 4 : 3;
      sum += rating;
      rows.push({
        agencyId,
        source: (k % 3 === 2 ? "inquiry" : "invite") as "invite" | "inquiry",
        rating,
        quality: Math.min(5, rating + (r() > 0.7 ? 0 : 0)),
        communication: Math.max(3, rating - (r() > 0.6 ? 1 : 0)),
        value: Math.max(3, rating - (r() > 0.5 ? 1 : 0)),
        timeliness: Math.max(3, rating - (r() > 0.7 ? 1 : 0)),
        results: Math.max(3, rating - (r() > 0.6 ? 1 : 0)),
        body,
        reviewerName: name,
        reviewerBusiness: business,
        service: demo.services[k % demo.services.length],
        visitorId: `demo-reviewer-${index}-${k}`,
        reply: k === 0 ? (/[a-z]/i.test(demo.name) ? "Thank you, it was a pleasure working with you!" : "شكراً لثقتكم، سعدنا بالعمل معكم!") : null,
        repliedAt: k === 0 ? new Date() : null,
        consentVersion: "2026-09",
        createdAt: new Date(now - Math.floor(r() * 90) * 24 * 3600 * 1000),
      });
    }
    await db.insert(reviews).values(rows);
    await db.update(agencies).set({ ratingSum: sum, ratingCount: count }).where(sql`${agencies.id} = ${agencyId}`);
  }

  // One demo promotion so the sponsored slot is visible. Admin can end it.
  const [firstPost] = fresh ? await db.select({ id: posts.id, agencyId: posts.agencyId }).from(posts).where(sql`${posts.agencyId} = ${agencyIds[1]}`).limit(1) : [];
  if (firstPost) {
    await db.insert(promotions).values({
      agencyId: firstPost.agencyId,
      postId: firstPost.id,
      placement: "feed",
      startsAt: new Date(now - 3600 * 1000),
      endsAt: new Date(now + 30 * 24 * 3600 * 1000),
      note: "Demo promotion (free pilot)",
    });
  }

  await addDemoPortfolio(log);
  await addDemoProfiles(log);
  await addDemoRoles(log);
  await addDemoTranslations(log);
  await addDemoRequests(log);
  log(`Seeded ${toCreate.length} demo agencies and ${postIds.length} posts.`);
  if (!production) {
    log(`Admin: ${adminEmail} / ${adminPassword}`);
    log(`Demo agency login: ${DEMO_AGENCIES[0].handle.replace(/\./g, "-")}@sawwiq.test / ${demoPassword}`);
  }
}

if (process.argv[1] && /seed\.ts$/.test(process.argv[1])) {
  seed({ reset: process.argv.includes("--reset"), adminOnly: process.argv.includes("--admin-only") })
    .then(() => closeDb())
    .catch(async (error) => {
      console.error(error);
      await closeDb();
      process.exit(1);
    });
}
