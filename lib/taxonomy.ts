// Typed copy of data/service-taxonomy.json. A unit test keeps the two in sync.
// Edit the JSON first, then mirror the change here.

export const taxonomy = {
  "version": 1,
  "categories": [
    {
      "key": "social_media",
      "name_ar": "إدارة السوشيال ميديا",
      "name_en": "Social media management",
      "services": [
        {
          "key": "smm_management",
          "name_ar": "إدارة حسابات التواصل الاجتماعي",
          "name_en": "Social media account management"
        },
        {
          "key": "smm_content",
          "name_ar": "صناعة المحتوى والتصميم",
          "name_en": "Content creation and design"
        },
        {
          "key": "smm_community",
          "name_ar": "إدارة المجتمع والردود",
          "name_en": "Community management"
        },
        {
          "key": "smm_strategy",
          "name_ar": "استراتيجية السوشيال ميديا",
          "name_en": "Social media strategy"
        },
        {
          "key": "smm_influencer",
          "name_ar": "حملات المؤثرين",
          "name_en": "Influencer campaigns"
        }
      ]
    },
    {
      "key": "paid_media",
      "name_ar": "الإعلانات المدفوعة",
      "name_en": "Paid advertising",
      "services": [
        {
          "key": "ads_meta",
          "name_ar": "إعلانات فيسبوك وإنستغرام",
          "name_en": "Facebook and Instagram ads"
        },
        {
          "key": "ads_tiktok",
          "name_ar": "إعلانات تيك توك",
          "name_en": "TikTok ads"
        },
        {
          "key": "ads_snapchat",
          "name_ar": "إعلانات سناب شات",
          "name_en": "Snapchat ads"
        },
        {
          "key": "ads_google",
          "name_ar": "إعلانات جوجل",
          "name_en": "Google ads"
        },
        {
          "key": "ads_linkedin",
          "name_ar": "إعلانات لينكد إن",
          "name_en": "LinkedIn ads"
        }
      ]
    },
    {
      "key": "creative",
      "name_ar": "الإنتاج الإبداعي",
      "name_en": "Creative production",
      "services": [
        {
          "key": "video_production",
          "name_ar": "إنتاج الفيديو والريلز",
          "name_en": "Video and Reels production"
        },
        {
          "key": "photography",
          "name_ar": "التصوير الفوتوغرافي",
          "name_en": "Photography"
        },
        {
          "key": "graphic_design",
          "name_ar": "التصميم الجرافيكي",
          "name_en": "Graphic design"
        },
        {
          "key": "copywriting",
          "name_ar": "كتابة المحتوى",
          "name_en": "Copywriting"
        }
      ]
    },
    {
      "key": "branding",
      "name_ar": "الهوية والعلامة التجارية",
      "name_en": "Branding",
      "services": [
        {
          "key": "brand_identity",
          "name_ar": "تصميم الهوية البصرية",
          "name_en": "Brand identity"
        },
        {
          "key": "brand_strategy",
          "name_ar": "استراتيجية العلامة التجارية",
          "name_en": "Brand strategy"
        }
      ]
    },
    {
      "key": "digital",
      "name_ar": "التسويق الرقمي",
      "name_en": "Digital marketing",
      "services": [
        {
          "key": "seo",
          "name_ar": "تحسين محركات البحث",
          "name_en": "SEO"
        },
        {
          "key": "email_marketing",
          "name_ar": "التسويق عبر البريد والواتساب",
          "name_en": "Email and WhatsApp marketing"
        },
        {
          "key": "web_design",
          "name_ar": "تصميم المواقع والمتاجر",
          "name_en": "Website and e-commerce design"
        },
        {
          "key": "analytics",
          "name_ar": "التحليلات والتقارير",
          "name_en": "Analytics and reporting"
        }
      ]
    }
  ],
  "business_types": [
    "restaurant_cafe",
    "clinic_health",
    "retail_shop",
    "real_estate",
    "education",
    "beauty_fitness",
    "ecommerce",
    "professional_services",
    "tourism_hospitality",
    "manufacturing",
    "ngo",
    "other"
  ],
  "platforms": [
    "instagram",
    "facebook",
    "tiktok",
    "snapchat",
    "linkedin",
    "youtube",
    "google",
    "x"
  ],
  "budget_bands_jod": [
    {
      "key": "under_300",
      "min": 0,
      "max": 299
    },
    {
      "key": "300_600",
      "min": 300,
      "max": 600
    },
    {
      "key": "600_1200",
      "min": 600,
      "max": 1200
    },
    {
      "key": "1200_2500",
      "min": 1200,
      "max": 2500
    },
    {
      "key": "over_2500",
      "min": 2500,
      "max": null
    },
    {
      "key": "unsure",
      "min": null,
      "max": null
    }
  ],
  "cities": [
    "amman",
    "zarqa",
    "irbid",
    "aqaba",
    "salt",
    "madaba",
    "karak",
    "mafraq",
    "jerash",
    "ajloun",
    "tafilah",
    "maan"
  ],
  "timelines": [
    "asap",
    "this_month",
    "within_3_months"
  ]
} as const;

export type Taxonomy = typeof taxonomy;
export type CategoryKey = Taxonomy["categories"][number]["key"];
export type ServiceKey =
  Taxonomy["categories"][number]["services"][number]["key"];
export type BusinessType = Taxonomy["business_types"][number];
export type Platform = Taxonomy["platforms"][number];
export type BudgetBandKey = Taxonomy["budget_bands_jod"][number]["key"];
export type City = Taxonomy["cities"][number];
export type Timeline = Taxonomy["timelines"][number];

export const allServices = taxonomy.categories.flatMap((category) =>
  category.services.map((service) => ({ ...service, category: category.key })),
);

export function isServiceKey(value: string): value is ServiceKey {
  return allServices.some((service) => service.key === value);
}
