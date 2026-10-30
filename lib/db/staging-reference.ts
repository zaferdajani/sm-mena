// Staging only: gives the staging.agency.* and staging.free.* accounts a complete
// reference profile (introduction, strengths, packages, clients with logos, links
// and project notes, posts with pictures and a video, reviews, a service waiting
// for approval), and redraws demo pictures whose files are missing from storage.
// Runs from seedStaging and on every staging build (lib/db/staging-refresh.ts).
// Refuses production. Idempotent: an account that already has the reference clients is left as is; clients and texts
// people added themselves are kept.
import { and, eq, inArray, sql } from "drizzle-orm";
import sharp from "sharp";
import { COUNTRIES, type Country } from "@/lib/countries";
import { assertStagingDatabase, isStagingMode } from "@/lib/core/rules/staging";
import { createPackage } from "@/lib/data/packages";
import { listClients, saveClient, setClientLogo } from "@/lib/data/portfolio-clients";
import { createPostFromProcessed } from "@/lib/data/posts";
import { getDb } from "@/lib/db";
import { agencies, portfolioClients, postImages, posts, reviews } from "@/lib/db/schema";
import { newAvatarKey, newClientLogoKey, processAvatar, processImage } from "@/lib/images";
import { resolveServices } from "@/lib/services/tags";
import { embedFromUrl } from "@/lib/social/embed";
import { storage } from "@/lib/storage";
import { demoAvatar, demoImage, type DemoKind } from "./demo-images";

/** An open film by the Blender Foundation (Big Buck Bunny), embeddable everywhere: the sample "video" of a project. */
const SAMPLE_VIDEO = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";

type RefPost = { kind: DemoKind; headline: string; caption: string; result?: string; video?: boolean };
type RefClient = {
  name: string;
  nameEn: string;
  industry: string;
  note: string;
  noteEn: string;
  links: (code: string) => { kind: string; value: string }[];
  posts: RefPost[];
};

const AGENCY_CLIENTS: RefClient[] = [
  {
    name: "مخبز السنابل (تجريبي)",
    nameEn: "Sanabel Bakery (demo)",
    industry: "restaurant_cafe",
    note:
      "مخبز عائلي بفرعين، كانت مبيعاته تعتمد على زبائن الحي فقط ولا يصله طلب عبر الإنترنت.\n\nما قمنا به: صوّرنا المنتجات في المخبز كل أسبوع، وأطلقنا ريلز يومياً عن الخَبز الصباحي، وأدرنا حملة إعلانات ميتا محلية حول الفرعين، وفعّلنا الطلب عبر واتساب من الحساب.\n\nالنتيجة خلال ستة أشهر: تضاعفت الطلبات عبر إنستغرام، وارتفع عدد المتابعين من 900 إلى 14 ألفاً، وصار عرض الجمعة ينفد قبل الظهر.",
    noteEn:
      "A family bakery with two branches that sold only to its neighbourhood and got no online orders.\n\nWhat we did: weekly product shoots at the bakery, a daily reel about the morning bake, a local Meta ads campaign around both branches, and WhatsApp ordering from the profile.\n\nResult in six months: Instagram orders doubled, followers grew from 900 to 14,000, and the Friday offer sells out before noon.",
    links: (code) => [
      { kind: "instagram", value: `sanabel.bakery.${code}.demo` },
      { kind: "tiktok", value: `sanabel.bakery.${code}.demo` },
      { kind: "website", value: "https://example.com/sanabel-bakery" },
    ],
    posts: [
      { kind: "video", headline: "من العجين إلى الفرن", caption: "ريلز الخَبز الصباحي: من العجين إلى الفرن في 30 ثانية. الفيديو هنا نموذج لبيئة الاختبار.", result: "1.2 مليون مشاهدة", video: true },
      { kind: "photo", headline: "خبز الصباح الطازج", caption: "جلسة تصوير أسبوعية في المخبز: إضاءة طبيعية وخلفيات من خشب الفرن نفسه.", result: "+65% طلبات عبر إنستغرام" },
      { kind: "ad", headline: "عرض الجمعة: كرواسون ×2", caption: "إعلان ميتا محلي في دائرة 3 كم حول الفرعين، مع زر طلب عبر واتساب.", result: "عائد إعلان 3.1 ضعف" },
    ],
  },
  {
    name: "مقهى الركن الهادئ (تجريبي)",
    nameEn: "Quiet Corner Café (demo)",
    industry: "restaurant_cafe",
    note:
      "مقهى مختص افتتح فرعاً جديداً ويريد أن يعرفه طلاب الجامعة القريبة.\n\nما قمنا به: هوية بصرية للحساب، ومحتوى عن المحاصيل وطرق التحضير، وتعاون مع ثلاثة صنّاع محتوى محليين، وإدارة يومية للتعليقات والرسائل.\n\nالنتيجة: 40% من زوار الفرع الجديد قالوا إنهم عرفوه من إنستغرام أو تيك توك.",
    noteEn:
      "A specialty café opening a new branch and wanting the nearby university's students to know it.\n\nWhat we did: a visual identity for the account, content about origins and brewing methods, collaborations with three local creators, and daily replies to comments and messages.\n\nResult: 40% of the new branch's visitors said they found it on Instagram or TikTok.",
    links: (code) => [
      { kind: "instagram", value: `quietcorner.cafe.${code}.demo` },
      { kind: "tiktok", value: `quietcorner.cafe.${code}.demo` },
      { kind: "facebook", value: `quietcornercafe${code}demo` },
    ],
    posts: [
      { kind: "content", headline: "قهوة اليوم: إثيوبيا", caption: "سلسلة «قهوة اليوم»: بطاقة لكل محصول مع طريقة التحضير المقترحة.", result: "+38% حفظ للمنشورات" },
      { kind: "branding", headline: "هوية الفرع الجديد", caption: "ألوان وخطوط الحساب الجديدة، مأخوذة من ديكور الفرع.", result: undefined },
    ],
  },
  {
    name: "عيادة ابتسامة لطب الأسنان (تجريبي)",
    nameEn: "Ibtisama Dental Clinic (demo)",
    industry: "clinic_health",
    note:
      "عيادة أسنان تريد حجوزات تبييض وتقويم بدل الاعتماد على الحالات الطارئة.\n\nما قمنا به: محتوى توعوي يجيب عن أسئلة المرضى، وإعلانات بحث على جوجل، وصفحة حجز بسيطة، مع الالتزام بضوابط الإعلان الطبي.\n\nالنتيجة: 120 حجزاً شهرياً من الإعلانات بتكلفة أقل بـ 30% من الشهر الأول.",
    noteEn:
      "A dental clinic that wanted whitening and braces bookings instead of relying on emergencies.\n\nWhat we did: educational content answering patients' questions, Google search ads and a simple booking page, within medical advertising rules.\n\nResult: 120 bookings a month from ads, at a cost 30% lower than in the first month.",
    links: () => [
      { kind: "instagram", value: "ibtisama.dental.demo" },
      { kind: "website", value: "https://example.com/ibtisama-dental" },
    ],
    posts: [
      { kind: "results", headline: "120 حجزاً في الشهر", caption: "تقرير شهري: الحجوزات من إعلانات البحث وتكلفة كل حجز.", result: "-30% تكلفة الحجز" },
      { kind: "ad", headline: "ابتسامتك تستحق", caption: "إعلان بحث على جوجل لخدمة التبييض، مع صفحة حجز مختصرة.", result: undefined },
    ],
  },
];

const FREELANCER_CLIENTS: RefClient[] = [
  {
    name: "مخبز السنابل (تجريبي)",
    nameEn: "Sanabel Bakery (demo)",
    industry: "restaurant_cafe",
    note:
      "صوّرت قائمة المخبز كاملة لموقعه وحساباته: 60 صورة منتج وفيديو قصير لكل صنف جديد.\n\nالتحدي: إضاءة المخبز صفراء وضيقة، فاستخدمت إضاءة محمولة وخلفيات من خشب الفرن نفسه ليبقى الطابع أصيلاً.",
    noteEn:
      "I shot the bakery's whole menu for its website and accounts: 60 product photos and a short video for each new item.\n\nThe challenge: the bakery's light is yellow and tight, so I used portable lights and backgrounds from the oven's own wood to keep it authentic.",
    links: (code) => [{ kind: "instagram", value: `sanabel.bakery.${code}.demo` }],
    posts: [
      { kind: "photo", headline: "قائمة المخبز", caption: "60 صورة منتج بخلفية موحّدة للموقع وتطبيقات التوصيل.", result: "+22% طلبات التوصيل" },
      { kind: "video", headline: "صنف جديد كل أسبوع", caption: "فيديو قصير لكل صنف جديد. الفيديو هنا نموذج لبيئة الاختبار.", video: true },
    ],
  },
  {
    name: "متجر ليلك للأزياء (تجريبي)",
    nameEn: "Lilac Boutique (demo)",
    industry: "retail_shop",
    note: "جلسات تصوير موسمية للمجموعات الجديدة، ومحتوى قصير على تيك توك يعرض القطع على عارضات من المدينة.",
    noteEn: "Seasonal shoots for each new collection, and short TikTok content showing the pieces on local models.",
    links: (code) => [
      { kind: "instagram", value: `lilac.boutique.${code}.demo` },
      { kind: "tiktok", value: `lilac.boutique.${code}.demo` },
    ],
    posts: [{ kind: "photo", headline: "مجموعة الربيع", caption: "جلسة تصوير مجموعة الربيع في الهواء الطلق.", result: "نفدت 3 قطع في أسبوع" }],
  },
];

const neighbours = (code: string) => COUNTRIES.map((c) => c.code).filter((c) => c !== code).slice(0, 2);

async function fillAgency(handle: string, country: Country, freelancer: boolean, log: (...a: unknown[]) => void) {
  const db = await getDb();
  const [agency] = await db.select().from(agencies).where(eq(agencies.handle, handle));
  if (!agency) return false;
  // Filled once: the reference clients are the marker. Clients and edits people added themselves are kept.
  const refNames = new Set([...AGENCY_CLIENTS, ...FREELANCER_CLIENTS].map((c) => c.name));
  if ((await listClients(agency.id)).some((c) => refNames.has(c.name))) return false;
  const code = country.code;
  const seeded = (text: string) => !text || text.startsWith("Demo ");

  let avatarKey = agency.avatarKey;
  if (!avatarKey) {
    avatarKey = newAvatarKey(agency.id);
    await storage().put(avatarKey, await processAvatar(await demoAvatar(freelancer ? "SC" : "SA", code.charCodeAt(0) * 7 + (freelancer ? 3 : 1))), "image/webp");
  }
  await db
    .update(agencies)
    .set({
      avatarKey,
      bio: !seeded(agency.bio) ? agency.bio : freelancer
        ? `مصوّر وصانع محتوى تجريبي في ${country.ar}: تصوير طعام ومنتجات وريلز قصيرة.`
        : `وكالة تسويق تجريبية في ${country.ar}: إدارة حسابات ومحتوى وإعلانات للمخابز والمقاهي والعيادات.`,
      about: agency.about ? agency.about : freelancer
        ? `حساب مرجعي في بيئة الاختبار يوضّح شكل ملف مستقل مكتمل. أصوّر الطعام والمنتجات في موقع العميل، وأسلّم الصور معدّلة خلال 48 ساعة، وأصنع ريلز قصيرة جاهزة للنشر. أعمل مع المخابز والمقاهي والمتاجر في ${country.ar}.`
        : `حساب مرجعي في بيئة الاختبار يوضّح شكل ملف وكالة مكتمل: عملاء بشعاراتهم وحساباتهم، ومشاريع بصورها وفيديوهاتها، وباقات بأسعارها، وتقييمات. فريقنا يخطط المحتوى شهرياً، ويصوّر في موقع العميل، ويدير الإعلانات، ويرسل تقريراً شهرياً بالأرقام. نعمل في ${country.ar} والدول المجاورة.`,
      strengths: agency.strengths.length ? agency.strengths : freelancer
        ? ["تصوير طعام في الموقع", "تسليم خلال 48 ساعة", "ريلز قصيرة جاهزة للنشر"]
        : ["ريلز ترفع الطلبات", "إعلانات محلية حول الفروع", "إدارة يومية للتعليقات والرسائل", "تقرير شهري بالأرقام"],
      services: [...new Set([...agency.services, ...(freelancer ? ["creative", "photography", "video_production", "social_media", "smm_content"] : ["social_media", "smm_management", "smm_content", "paid_media", "ads_meta", "ads_google", "creative", "photography"])])],
      platforms: freelancer ? ["instagram", "tiktok"] : ["instagram", "tiktok", "facebook", "google"],
      industries: freelancer ? ["restaurant_cafe", "retail_shop"] : ["restaurant_cafe", "clinic_health", "retail_shop"],
      servesCountries: freelancer ? [] : neighbours(code),
      instagram: `${handle.replace(/\./g, "_")}_demo`,
      website: "https://example.com",
      foundedYear: freelancer ? 2021 : 2018,
      teamSize: freelancer ? "1" : "6-15",
      translation: {
        bio: freelancer ? `Demo photographer and content creator in ${country.en}: food, products and short reels.` : `Demo marketing agency in ${country.en}: accounts, content and ads for bakeries, cafés and clinics.`,
        about: freelancer
          ? `A reference account on staging showing a complete freelancer profile. I shoot food and products on site, deliver edited photos within 48 hours and make short reels ready to post.`
          : `A reference account on staging showing a complete agency profile: clients with their logos and accounts, projects with pictures and videos, packages with prices, and reviews.`,
      },
    })
    .where(eq(agencies.id, agency.id));

  const packages = freelancer
    ? [
        { title: "جلسة تصوير طعام", description: "نصف يوم في موقعك، 25 صورة معدّلة.", service: "photography", priceJod: 120, billing: "one_off" as const, deliverables: "25 صورة معدّلة\nحقوق استخدام على الحسابات والموقع\nتسليم خلال 48 ساعة".split("\n") },
        { title: "محتوى شهري", description: "صور وريلز قصيرة كل شهر.", service: "smm_content", priceJod: 200, billing: "monthly" as const, deliverables: "12 صورة\n4 ريلز\nزيارة تصوير واحدة".split("\n") },
      ]
    : [
        { title: "إدارة حسابات شهرية", description: "خطة شهرية، تصوير، نشر، ورد يومي على التعليقات.", service: "smm_management", priceJod: 350, billing: "monthly" as const, deliverables: "12 منشوراً\n8 ريلز\nإدارة التعليقات والرسائل يومياً\nتقرير شهري".split("\n") },
        { title: "حملة إعلانات ميتا", description: "حملة محلية حول فروعك مع زر واتساب.", service: "ads_meta", priceJod: 250, billing: "one_off" as const, deliverables: "إعداد الحملة\n3 تصاميم إعلانية\nمتابعة يومية لمدة 30 يوماً\nتقرير نهائي".split("\n") },
        { title: "جلسة تصوير منتجات", description: "يوم تصوير في موقعك للقائمة كاملة.", service: "photography", priceJod: 180, billing: "one_off" as const, deliverables: "40 صورة معدّلة\nخلفيات موحّدة\nتسليم خلال 3 أيام".split("\n") },
      ];
  for (const p of packages) await createPackage(agency.id, p);

  const video = embedFromUrl(SAMPLE_VIDEO);
  let seed = code.charCodeAt(0) * 1000 + (freelancer ? 500 : 0);
  let postCount = 0;
  const now = Date.now();
  for (const c of freelancer ? FREELANCER_CLIENTS : AGENCY_CLIENTS) {
    const saved = await saveClient(agency.id, null, {
      name: c.name,
      industry: c.industry,
      country: code,
      description: c.note,
      links: c.links(code),
      translation: { name: c.nameEn, description: c.noteEn },
    });
    if (!("ok" in saved)) continue;
    const logoKey = newClientLogoKey(agency.id);
    await storage().put(logoKey, await processAvatar(await demoAvatar(c.nameEn.slice(0, 2).toUpperCase(), seed++)), "image/webp");
    await setClientLogo(agency.id, saved.id, logoKey);
    for (const p of c.posts) {
      const image = await processImage(await demoImage(p.kind, seed++, p.headline, `@${handle}`, p.kind === "video"));
      await createPostFromProcessed(
        agency.id,
        {
          caption: p.caption,
          services: [p.kind === "ad" ? (freelancer ? "smm_content" : "ads_meta") : p.kind === "photo" ? "photography" : p.kind === "video" ? "video_production" : "smm_content"],
          platforms: ["instagram"],
          industry: c.industry,
          result: p.result ?? null,
          clientId: saved.id,
          embed: p.video ? video : null,
        },
        [image],
        new Date(now - postCount * 26 * 3600 * 1000),
      );
      postCount++;
    }
  }

  const rows = [
    ["سلمى (تجريبي)", "مخبز السنابل", "فريق منظّم ويرد بسرعة. تضاعفت طلباتنا عبر إنستغرام خلال أشهر.", 5],
    ["Omar (demo)", "Quiet Corner Café", "Great content and clear monthly reports. Our new branch got busy fast.", 5],
    ["د. رنا (تجريبي)", "عيادة ابتسامة", "التزموا بضوابط الإعلان الطبي وخفّضوا تكلفة الحجز.", 4],
  ] as const;
  const added = await db.insert(reviews).values(
    rows.map(([name, business, body, rating], k) => ({
      agencyId: agency.id,
      source: "invite" as const,
      rating,
      quality: rating,
      communication: rating,
      value: Math.max(3, rating - 1),
      timeliness: rating,
      results: rating,
      body,
      reviewerName: name,
      reviewerBusiness: business,
      service: freelancer ? "photography" : "smm_management",
      visitorId: `staging-reference-${handle}-${k}`,
      reply: k === 0 ? "شكراً لثقتكم، سعدنا بالعمل معكم!" : null,
      repliedAt: k === 0 ? new Date() : null,
      consentVersion: "2026-09",
      createdAt: new Date(now - (k + 1) * 9 * 24 * 3600 * 1000),
    })),
  ).onConflictDoNothing().returning({ rating: reviews.rating });
  const sum = added.reduce((s, r) => s + r.rating, 0);
  if (added.length) await db.update(agencies).set({ ratingSum: sql`${agencies.ratingSum} + ${sum}`, ratingCount: sql`${agencies.ratingCount} + ${added.length}` }).where(eq(agencies.id, agency.id));

  // A service the account typed itself: shown on the profile as awaiting approval, and waiting in Admin → Services.
  const proposed = await resolveServices(agency.id, [], [freelancer ? "تصوير جوي بالدرون" : "إدارة حجوزات المطاعم عبر واتساب"]);
  if (proposed.pending.length) await db.update(agencies).set({ pendingServices: [...new Set([...agency.pendingServices, ...proposed.pending])] }).where(eq(agencies.id, agency.id));

  log(`  filled @${handle}: ${packages.length} packages, ${postCount} posts, ${(freelancer ? FREELANCER_CLIENTS : AGENCY_CLIENTS).length} clients`);
  return true;
}

const MIME: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", avif: "image/avif" };

/** True only when storage answers that the file is not there (a network error is not a "missing" answer). */
async function missing(key: string) {
  try {
    const res = await fetch(storage().url(key), { method: "HEAD" });
    return res.status === 404 || res.status === 400;
  } catch {
    return false;
  }
}

async function redraw(key: string, kind: DemoKind, seed: number, headline: string, brand: string, size: number) {
  const ext = key.split(".").pop()?.toLowerCase() ?? "webp";
  const png = await demoImage(kind, seed, headline, brand);
  const format = ext === "jpg" ? "jpeg" : (ext as "webp" | "jpeg" | "png" | "avif");
  const body = await sharp(png).resize(size, size, { fit: "cover" }).toFormat(format in MIME || format === "jpeg" ? format : "webp").toBuffer();
  await storage().put(key, body, MIME[ext] ?? "image/webp");
}

/** Demo agencies (staging copies of the sample data) whose pictures are missing from staging storage get new ones at the same keys. */
async function repairDemoMedia(log: (...a: unknown[]) => void) {
  if (process.env.STORAGE_PROVIDER !== "supabase") return;
  const db = await getDb();
  const demo = await db.select({ id: agencies.id, handle: agencies.handle, name: agencies.name, avatarKey: agencies.avatarKey }).from(agencies).where(eq(agencies.isDemo, true));
  if (!demo.length) return;
  const ids = demo.map((d) => d.id);
  const images = await db
    .select({ key: postImages.key, thumbKey: postImages.thumbKey, caption: posts.caption, agencyId: posts.agencyId })
    .from(postImages)
    .innerJoin(posts, eq(postImages.postId, posts.id))
    .where(inArray(posts.agencyId, ids));
  const logos = await db.select({ key: portfolioClients.logoKey, name: portfolioClients.name }).from(portfolioClients).where(and(inArray(portfolioClients.agencyId, ids), sql`${portfolioClients.logoKey} is not null`));
  const byId = new Map(demo.map((d) => [d.id, d]));
  type Job = () => Promise<boolean>;
  const jobs: Job[] = [];
  demo.forEach((d, i) => {
    if (d.avatarKey) jobs.push(async () => (await missing(d.avatarKey!)) && (await storage().put(d.avatarKey!, await processAvatar(await demoAvatar(d.name.slice(0, 2), i + 1)), "image/webp"), true));
  });
  images.forEach((img, i) => {
    const brand = `@${byId.get(img.agencyId)?.handle ?? "sawwiq"}`;
    const headline = img.caption.slice(0, 28) || "Sawwiq";
    const kinds: DemoKind[] = ["content", "ad", "photo", "branding", "results", "video"];
    jobs.push(async () => (await missing(img.key)) && (await redraw(img.key, kinds[i % kinds.length], i + 11, headline, brand, 1080), true));
    jobs.push(async () => (await missing(img.thumbKey)) && (await redraw(img.thumbKey, kinds[i % kinds.length], i + 11, headline, brand, 400), true));
  });
  logos.forEach((l, i) => jobs.push(async () => (await missing(l.key!)) && (await storage().put(l.key!, await processAvatar(await demoAvatar(l.name.slice(0, 2), i + 501)), "image/webp"), true)));
  let fixed = 0;
  for (let i = 0; i < jobs.length; i += 12) {
    const done = await Promise.all(jobs.slice(i, i + 12).map((j) => j().catch(() => false)));
    fixed += done.filter(Boolean).length;
  }
  log(`  demo media: ${fixed} missing pictures redrawn of ${jobs.length} checked`);
}

export async function fillReferenceAccounts(log: (...a: unknown[]) => void = console.log) {
  if (!isStagingMode()) return;
  assertStagingDatabase();
  for (const country of COUNTRIES) {
    await fillAgency(`staging.agency.${country.code}`, country, false, log);
    await fillAgency(`staging.free.${country.code}`, country, true, log);
  }
  await repairDemoMedia(log);
}
