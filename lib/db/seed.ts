// Seeds a local database with clearly fictional demo agencies.
//   npm run db:seed            seed if empty
//   npm run db:seed -- --reset wipe everything first
// Demo agencies carry is_demo=true so they can be removed before launch
// (Admin → Agencies → "Remove demo data").
import { sql } from "drizzle-orm";
import { updateAgency, createAgency } from "../data/agencies";
import { createPostFromProcessed } from "../data/posts";
import { createUser, getUserByEmail } from "../data/users";
import { processAvatar, processImage, newAvatarKey } from "../images";
import { storage } from "../storage";
import { closeDb, getDb } from "./index";
import { demoAvatar, demoImage, rng, type DemoKind } from "./demo-images";
import { agencies, events, follows, inquiries, likes, packages, posts, promotions, reviews, saves } from "./schema";

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
];

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
  await db.execute(sql`truncate table audit_logs, events, reports, promotions, proposals, request_matches, project_requests, reviews, review_requests, packages, inquiries, follows, saves, likes, post_images, posts, agencies, sessions, users restart identity cascade`);
}

export async function seed({ reset: doReset = false, quiet = false } = {}) {
  const log = quiet ? () => {} : console.log;
  const db = await getDb();
  if (doReset) await reset();
  const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(agencies)) as { n: number }[];
  if (n > 0) {
    log(`Database already has ${n} agencies. Use --reset to start over.`);
    return;
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@sawwiq.test";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin-pass-123";
  if (!(await getUserByEmail(adminEmail))) await createUser(adminEmail, adminPassword, "admin");

  const now = Date.now();
  const r = rng(42);
  const postIds: string[] = [];
  const agencyIds: string[] = [];

  for (const [index, demo] of DEMO_AGENCIES.entries()) {
    const user = await createUser(`${demo.handle.replace(/\./g, "-")}@sawwiq.test`, DEMO_PASSWORD);
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
        whatsapp: `+96279${String(1000000 + index * 7919).slice(0, 7)}`,
        phone: `+96279${String(1000000 + index * 7919).slice(0, 7)}`,
        email: `hello@${demo.handle.replace(/\./g, "-")}.example`,
        website: `https://${demo.handle.replace(/\./g, "-")}.example`,
        instagram: demo.handle.replace(/\./g, "_"),
        foundedYear: demo.founded,
        teamSize: demo.team,
      },
      { isVerified: demo.verified, isDemo: true },
    );
    agencyIds.push(agency.id);

    const initials = demo.name.replace(/[^A-Za-z؀-ۿ ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const avatarKey = newAvatarKey(agency.id);
    await storage().put(avatarKey, await processAvatar(await demoAvatar(initials, index + 1)), "image/webp");
    await updateAgency(agency.id, { avatarKey });

    const postTotal = 4 + Math.floor(r() * 4);
    for (let p = 0; p < postTotal; p++) {
      const service = demo.services[p % demo.services.length];
      const kind = kindFor(service);
      const imageCount = 1 + Math.floor(r() * 3);
      const processed = [];
      for (let i = 0; i < imageCount; i++) {
        const headline = HEADLINES[kind][Math.floor(r() * HEADLINES[kind].length)];
        const tall = p % 3 === 1;
        processed.push(await processImage(await demoImage(i === imageCount - 1 && imageCount > 1 ? "results" : kind, index * 100 + p * 10 + i, headline, `@${demo.handle}`, tall)));
      }
      const post = await createPostFromProcessed(
        agency.id,
        {
          caption: CAPTIONS[Math.floor(r() * CAPTIONS.length)],
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

  await db.insert(inquiries).values([
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
  for (const [index, agencyId] of agencyIds.entries()) {
    const demo = DEMO_AGENCIES[index];
    const pkgRows = demo.services.slice(0, 2).map((service, i) => ({
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
    const count = 2 + Math.floor(r() * 4);
    let sum = 0;
    const rows = [];
    for (let k = 0; k < count; k++) {
      const [name, business, body] = REVIEW_TEXTS[(index + k) % REVIEW_TEXTS.length];
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
  const [firstPost] = await db.select({ id: posts.id, agencyId: posts.agencyId }).from(posts).where(sql`${posts.agencyId} = ${agencyIds[1]}`).limit(1);
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

  log(`Seeded ${DEMO_AGENCIES.length} demo agencies and ${postIds.length} posts.`);
  log(`Admin: ${adminEmail} / ${adminPassword}`);
  log(`Demo agency login: ${DEMO_AGENCIES[0].handle.replace(/\./g, "-")}@sawwiq.test / ${DEMO_PASSWORD}`);
}

if (process.argv[1] && /seed\.ts$/.test(process.argv[1])) {
  seed({ reset: process.argv.includes("--reset") })
    .then(() => closeDb())
    .catch(async (error) => {
      console.error(error);
      await closeDb();
      process.exit(1);
    });
}
