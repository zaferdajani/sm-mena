// Demo introductions, strengths, countries served and portfolio clients
// (with the accounts the agency runs) for a few demo agencies, so the About
// and Clients tabs and cross-country listings have something to show.
// Businesses and accounts are made up for the demo.

export type DemoProfile = {
  serves?: string[];
  about: string;
  strengths: string[];
  /** `translation`: the client's name and note in the agency's other language, so an English page never shows «(تجريبي)» and vice versa. */
  clients?: { name: string; industry: string; country: string; description: string; links: { kind: string; value: string }[]; posts: number; translation?: { name: string; description: string } }[];
};

export const DEMO_PROFILES: Record<string, DemoProfile> = {
  "nakhla.studio": {
    serves: ["sa", "ae"],
    about:
      "استوديو محتوى في عمّان متخصص في المطاعم والمقاهي منذ 2019. نصوّر في موقعك، ونكتب المحتوى بلهجة جمهورك، وندير الحسابات يومياً مع تقرير شهري واضح. نعمل مع مطاعم في الأردن والسعودية والإمارات.",
    strengths: ["ريلز للمطاعم ترفع الطلبات", "تصوير أطباق احترافي في الموقع", "إدارة يومية للتعليقات والرسائل", "تقرير شهري بالأرقام"],
    clients: [
      {
        name: "مقهى الياسمين (تجريبي)",
        translation: { name: "Yasmeen Café (demo)", description: "Monthly content, Reels and account management since 2023." },
        industry: "restaurant_cafe",
        country: "jo",
        description: "محتوى شهري وريلز وإدارة حسابات منذ 2023.",
        links: [
          { kind: "instagram", value: "yasmeen.cafe.demo" },
          { kind: "tiktok", value: "yasmeen.cafe.demo" },
          { kind: "facebook", value: "yasmeencafedemo" },
          { kind: "website", value: "https://example.com/yasmeen-cafe" },
        ],
        posts: 2,
      },
      {
        name: "مطعم بيت الكنافة (تجريبي)",
        translation: { name: "Kunafa House Restaurant (demo)", description: "The Riyadh branch launch: menu photography and an opening campaign on Instagram and Snapchat." },
        industry: "restaurant_cafe",
        country: "sa",
        description: "إطلاق فرع الرياض: تصوير المنيو وحملة افتتاح على إنستغرام وسناب شات.",
        links: [
          { kind: "instagram", value: "kunafa.house.demo" },
          { kind: "snapchat", value: "kunafahousedemo" },
          { kind: "google_maps", value: "https://maps.google.com/?q=kunafa+house+demo" },
        ],
        posts: 1,
      },
    ],
  },
  "petra.growth": {
    serves: ["sa", "ae", "kw", "qa", "bh", "om", "eg"],
    about: "Performance marketing team in Amman running Meta, Google and TikTok ads for online stores across the Arab world. We report weekly on cost per order, not likes.",
    strengths: ["Meta and TikTok ads for e-commerce", "Weekly cost-per-order reporting", "Arabic ad creatives tested at scale", "Shopify and Salla tracking set up right"],
    clients: [
      {
        name: "Oud & Musk Store (demo)",
        translation: { name: "متجر عود ومسك (تجريبي)", description: "إعلانات ممولة على وسائل التواصل وتسوق جوجل منذ 2024." },
        industry: "ecommerce",
        country: "sa",
        description: "Paid social and Google Shopping since 2024.",
        links: [
          { kind: "website", value: "https://example.com/oud-musk" },
          { kind: "instagram", value: "oudmusk.demo" },
          { kind: "tiktok", value: "oudmusk.demo" },
        ],
        posts: 2,
      },
    ],
  },
  "search.first.jo": {
    serves: ["sa", "ae"],
    about: "SEO and Google Ads for clinics, schools and professional services. We build fast bilingual websites and get them to the first page of Google and Maps.",
    strengths: ["Google Maps and local SEO", "Bilingual websites that load fast", "Google Ads for booked appointments"],
  },
  "reel.house.jo": {
    serves: ["sa"],
    about: "فريق ريلز وتيك توك صغير وسريع. نكتب الفكرة، نصوّر، ونمنتج خلال 48 ساعة.",
    strengths: ["فكرة وتصوير ومونتاج خلال 48 ساعة", "محتوى تيك توك بلهجة محلية"],
  },
  "najd.creative": {
    serves: ["ae", "kw", "bh"],
    about: "وكالة سعودية في الرياض لإدارة الحسابات والمحتوى وإعلانات سناب شات وتيك توك. نعرف جمهور الخليج ونقيس كل حملة بالمبيعات.",
    strengths: ["حملات سناب شات للسوق السعودي", "محتوى بالهجة السعودية", "تقارير أسبوعية للمبيعات"],
    clients: [
      {
        name: "حلويات السدرة (تجريبي)",
        translation: { name: "Sidra Sweets (demo)", description: "Account management and Snapchat ads for the Ramadan season." },
        industry: "restaurant_cafe",
        country: "sa",
        description: "إدارة حسابات وإعلانات سناب شات لموسم رمضان.",
        links: [
          { kind: "snapchat", value: "sidra.sweets.demo" },
          { kind: "instagram", value: "sidra.sweets.demo" },
          { kind: "x", value: "sidrasweetsdemo" },
          { kind: "tiktok", value: "sidra.sweets.demo" },
        ],
        posts: 2,
      },
    ],
  },
  "dubai.loop": {
    serves: ["sa", "qa", "om"],
    about: "Content studio and paid social for hotels, restaurants and lifestyle brands. Based in Dubai, shooting across the Gulf.",
    strengths: ["Hotel and resort video", "Paid social for bookings", "YouTube and Instagram series"],
    clients: [
      {
        name: "Marina Bay Suites (demo)",
        translation: { name: "أجنحة مارينا باي (تجريبي)", description: "محتوى دائم وحملات حجوزات." },
        industry: "tourism_hospitality",
        country: "ae",
        description: "Always-on content and booking campaigns.",
        links: [
          { kind: "instagram", value: "marinabaysuites.demo" },
          { kind: "youtube", value: "marinabaysuitesdemo" },
          { kind: "website", value: "https://example.com/marina-bay-suites" },
        ],
        posts: 2,
      },
    ],
  },
  "nile.digital": {
    serves: ["sa"],
    about: "فريق متكامل في القاهرة: هوية بصرية ومحتوى وإعلانات ممولة. نعمل مع علامات مصرية وسعودية.",
    strengths: ["هوية بصرية كاملة", "إعلانات ميتا للمتاجر", "محتوى فيسبوك وتيك توك"],
  },
  "riyadh.pulse": {
    about: "Google Ads, SEO and bilingual websites for Saudi real estate and professional services.",
    strengths: ["Google Ads for real-estate leads", "Arabic and English SEO", "Landing pages that convert"],
  },
};

/**
 * Who's on each demo team and which roles it looks for partners for, plus demo
 * freelancers (docs/30). Role keys come from data/service-catalog.json.
 */
export const DEMO_ROLES: Record<string, { kind?: "agency" | "freelancer"; team: string[]; seeks?: string[] }> = {
  "nakhla.studio": { team: ["photographer", "graphic_designer", "content_writer_ar", "social_media_manager"], seeks: ["videographer", "video_editor", "media_buyer"] },
  "reel.house.jo": { team: ["videographer", "video_editor", "motion_designer"], seeks: ["photographer"] },
  "petra.growth": { team: ["media_buyer", "strategist"], seeks: ["graphic_designer", "video_editor"] },
  "madaba.pixels": { kind: "freelancer", team: ["photographer"] },
  "salt.stories": { kind: "freelancer", team: ["videographer", "video_editor"] },
  "najd.creative": { team: ["social_media_manager", "content_writer_ar", "media_buyer"], seeks: ["photographer", "videographer"] },
  "abha.trails": { kind: "freelancer", team: ["videographer", "photographer", "drone_operator"] },
  "search.first.jo": { team: ["seo_specialist", "web_developer"], seeks: ["content_writer_ar"] },
};
