// English versions of the demo agencies that write in Arabic (docs/15, "Agency
// content in two languages"): name, bio, About and strengths, and each demo
// post's caption, keyed by the Arabic caption. Applied by the seed
// (addDemoTranslations), to new and existing demo data.

export type DemoTranslation = {
  name: string;
  bio: string;
  about?: string;
  strengths?: string[];
  /** Arabic caption → English caption. */
  captions: Record<string, string>;
};

export const DEMO_TRANSLATIONS: Record<string, DemoTranslation> = {
  "nakhla.studio": {
    name: "Nakhla Studio",
    bio: "Social media content for restaurants and cafés in Amman: photography, Reels and account management.",
    about:
      "A content studio in Amman specialising in restaurants and cafés since 2019. We shoot on location, write in your audience's own dialect and run your accounts every day, with a clear monthly report. We work with restaurants in Jordan, Saudi Arabia and the UAE.",
    strengths: ["Restaurant Reels that bring in orders", "Professional food photography on location", "Daily handling of comments and messages", "A monthly report in numbers"],
    captions: {
      "جلسة تصوير قائمة الإفطار لمقهى في جبل عمّان: قهوة مختصة وكنافة وكرواسون بإضاءة طبيعية.": "Breakfast menu shoot for a café in Jabal Amman: specialty coffee, knafeh and croissants in natural light.",
      "خلف الكواليس: تصوير ريلز لفن اللاتيه مع باريستا المقهى بهاتف وجيمبال.": "Behind the scenes: filming latte-art Reels with the café's barista on a phone and gimbal.",
      "هوية موحّدة لحساب مطعم على إنستغرام: شبكة منشورات متناسقة للأطباق والمكان.": "A consistent Instagram look for a restaurant: a matching grid of dishes and the space.",
    },
  },
  "sahel.media": {
    name: "Sahel Media",
    bio: "Account management and ad campaigns for clinics and medical centres.",
    captions: {
      "تصوير استقبال عيادة في إربد لحساباتها على السوشيال ميديا: مكان نظيف ومريح للمرضى.": "Photographing a clinic's reception in Irbid for its social accounts: clean and welcoming for patients.",
      "محتوى يقدّمه الطبيب: طبيب أسنان يشرح للمريض خطوات العلاج بلغة بسيطة.": "Doctor-led content: a dentist explains each step of treatment in plain words.",
      "حملة توعية صحية: منشورات بألوان العيادة وحساب إنستغرام متجدد.": "A health-awareness campaign: posts in the clinic's colours and a refreshed Instagram account.",
    },
  },
  "zaytoon.brand": {
    name: "Zaytoon Identity",
    bio: "Visual identities and brand strategy for start-ups.",
    captions: {
      "هوية بصرية كاملة لعلامة ناشئة: شعار وبطاقات وورق رسمي ولوحة ألوان بالزيتوني والكريمي.": "A full visual identity for a new brand: logo, cards, stationery and an olive-and-cream palette.",
      "دليل الهوية: الخطوط والألوان وطريقة استخدام الشعار في كل مكان.": "The brand guide: typefaces, colours and how to use the logo everywhere.",
      "تصميم تغليف لزيت زيتون حرفي: زجاجات وعلب كرافت بشعار هندسي بسيط.": "Packaging for an artisan olive oil: bottles and kraft boxes with a simple geometric mark.",
    },
  },
  "zarqa.digital": {
    name: "Zarqa Digital",
    bio: "Affordable digital marketing for shops and small businesses in Zarqa.",
    captions: {
      "تصوير واجهة محل أدوات منزلية في الزرقاء لحملة فيسبوك محلية.": "Photographing a homeware shop front in Zarqa for a local Facebook campaign.",
      "إعلان خصومات لمتجر أجهزة على فيسبوك وإنستغرام: تصميم وإعلان ممول.": "A sale ad for an electronics store on Facebook and Instagram: design and paid promotion.",
      "قوالب منشورات ثابتة للمحلات الصغيرة: تصميم مرة واحدة واستخدام طوال الشهر.": "Post templates for small shops: designed once, used all month.",
    },
  },
  "snap.souq": {
    name: "Snap Souq",
    bio: "Snapchat and TikTok campaigns for online stores, measured in sales.",
    captions: {
      "إعلان سناب شات لسماعات جديدة: موديل وخلفية صفراء جريئة وتصوير عمودي.": "A Snapchat ad for new headphones: a model, a bold yellow backdrop, shot vertical.",
      "تصوير منتجات إكسسوارات لمتجر إلكتروني على خلفية صفراء.": "Accessory product shots for an online store on a yellow backdrop.",
      "حملة إطلاق متجر: من الإعلان إلى صفحة الدفع والتوصيل.": "A store launch campaign: from the ad to checkout and delivery.",
    },
  },
  "madaba.pixels": {
    name: "Madaba Pixels",
    bio: "Product photography and post design for shops and restaurants.",
    captions: {
      "تصوير منتجات فسيفساء مادبا اليدوية لمتجر هدايا على إنستغرام.": "Photographing handmade Madaba mosaics for a gift shop on Instagram.",
      "جلسة تصوير قائمة مطعم: منسف ومقبلات بتصوير علوي.": "A restaurant menu shoot: mansaf and mezze from above.",
      "استوديو تصوير منتجات صغير: إضاءة وخلفيات جاهزة للمتاجر والمطاعم.": "A small product studio: lighting and backdrops ready for shops and restaurants.",
    },
  },
  "shifa.digital": {
    name: "Shifa Digital",
    bio: "Healthcare marketing for clinics, dental centres, pharmacies and physiotherapy: bookings through Google and Meta, doctor-led videos and review management, within Ministry of Health and syndicate rules.",
    captions: {
      "فيديو توعوي يقدّمه طبيب جلدية لعيادته، بتصوير بسيط داخل العيادة.": "An awareness video presented by a dermatologist, filmed simply inside the clinic.",
      "محتوى لمركز علاج طبيعي: تمارين الركبة بإشراف المعالج.": "Content for a physiotherapy centre: knee exercises guided by the therapist.",
      "إطلاق خدمة توصيل صيدلية عبر إعلانات ميتا وطلبات واتساب.": "Launching a pharmacy's delivery service with Meta ads and WhatsApp orders.",
      "حملة حجوزات لعيادة أسنان في عبدون: إعلانات جوجل، تحسين خرائط جوجل، ومتابعة عبر واتساب.": "A bookings campaign for a dental clinic in Abdoun: Google Ads, Google Maps optimisation and WhatsApp follow-up.",
      "إطلاق خدمة التوصيل لصيدلية في إربد عبر إعلانات ميتا وطلبات واتساب.": "Launching delivery for a pharmacy in Irbid with Meta ads and WhatsApp orders.",
      "تحسين ظهور مركز طبي على جوجل: صفحات للخدمات، تقييمات المرضى، وموقع أسرع.": "Getting a medical centre found on Google: service pages, patient reviews and a faster website.",
    },
  },
  "najd.creative": {
    name: "Najd Creative",
    bio: "Account management, content and Snapchat and TikTok ads for Saudi brands in Riyadh.",
    about: "A Saudi agency in Riyadh for account management, content and Snapchat and TikTok ads. We know Gulf audiences and measure every campaign in sales.",
    strengths: ["Snapchat campaigns for the Saudi market", "Content in the Saudi dialect", "Weekly sales reports"],
    captions: {
      "تصوير طبق مطعم في الرياض لسناب شات بالهاتف والجيمبال.": "Filming a Riyadh restaurant dish for Snapchat on a phone and gimbal.",
      "محتوى عمودي لصانع محتوى سعودي في بوليفارد الرياض ليلًا.": "Vertical content with a Saudi creator at Riyadh Boulevard at night.",
      "تصوير متجر عبايات في الرياض لحساباته على السوشيال ميديا.": "Photographing an abaya boutique in Riyadh for its social accounts.",
    },
  },
  "gulf.pixel.kw": {
    name: "Gulf Pixel",
    bio: "Product photography and Snapchat and Instagram content for shops and restaurants in Kuwait.",
    captions: {
      "تصوير عطور فاخرة على سطح عاكس لمتجر كويتي.": "Luxury perfumes on a reflective surface for a Kuwaiti store.",
      "تصوير حلويات مقهى في الكويت: كيكة فستق وقهوة عربية وتمر.": "Café desserts in Kuwait: pistachio cake, Arabic coffee and dates.",
      "افتتاح مطعم برغر في مدينة الكويت: محتوى سناب شات من يوم الافتتاح.": "A burger restaurant opening in Kuwait City: Snapchat content from opening day.",
    },
  },
  "manama.social": {
    name: "Manama Social",
    bio: "Account management, design and Meta ads for small and medium businesses in Bahrain.",
    captions: {
      "تصوير بوتيك في المنامة لحسابه على إنستغرام.": "Photographing a Manama boutique for its Instagram.",
      "تصميم إعلانات ميتا لشركة صغيرة في البحرين مع معاينة على الهاتف.": "Meta ad designs for a small business in Bahrain, previewed on a phone.",
      "تصوير عيادة أسنان في البحرين لصفحتها على فيسبوك.": "Photographing a dental clinic in Bahrain for its Facebook page.",
    },
  },
  "muscat.media": {
    name: "Muscat Media",
    bio: "Content, photography and ads for tourism, hospitality and restaurants in Oman.",
    captions: {
      "قرى الجبل الأخضر عند الشروق لحملة سياحية في عُمان.": "Jebel Akhdar villages at sunrise for a tourism campaign in Oman.",
      "منتجع على شاطئ مسقط بعمارة عُمانية تقليدية لحملة ضيافة.": "A Muscat beach resort in traditional Omani architecture for a hospitality campaign.",
      "طبق سمك مشوي لمطعم على البحر في مسقط.": "A grilled fish dish for a seafront restaurant in Muscat.",
    },
  },
  "nile.digital": {
    name: "Nile Digital",
    bio: "A full team for Egyptian brands in Cairo: visual identity, content and paid ads.",
    about: "A full team in Cairo: visual identity, content and paid ads. We work with Egyptian and Saudi brands.",
    strengths: ["Complete visual identity", "Meta ads for online stores", "Facebook and TikTok content"],
    captions: {
      "هوية بصرية لعلامة أزياء مصرية ناشئة: شعار على الأكياس والبطاقات والعلب.": "Identity for a new Egyptian fashion brand: the logo on bags, cards and boxes.",
      "اجتماع فريق العمل في القاهرة: لوحات أفكار لحملة جديدة.": "Team meeting in Cairo: mood boards for a new campaign.",
      "إعلان خارجي لعلامة أثاث منزلي في القاهرة.": "An outdoor ad for a home furniture brand in Cairo.",
    },
  },
  "dammam.studio": {
    name: "Dammam Studio",
    bio: "Photography and video production for factories, restaurants and companies in the Eastern Province.",
    captions: {
      "فيلم منتج لمصنع في الدمام: كاميرا سينمائية وإضاءة درامية.": "A product film for a factory in Dammam: cinema camera and dramatic lighting.",
      "مطعم مأكولات بحرية على كورنيش الدمام وقت الغروب لإنستغرام.": "A seafood restaurant on the Dammam corniche at sunset, for Instagram.",
      "صور شخصية احترافية لموظفي شركة في المنطقة الشرقية.": "Professional portraits of a company's staff in the Eastern Province.",
    },
  },
  "makkah.hospitality": {
    name: "Makkah Hospitality Marketing",
    bio: "Account management and Meta and Google ads for hotels, Umrah operators and hospitality in Makkah.",
    captions: {
      "تصوير بهو فندق في مكة المكرمة لحملة ضيافة.": "Photographing a hotel lobby in Makkah for a hospitality campaign.",
      "جناح فندقي بإطلالة على المدينة عند المساء لإعلانات الحجز.": "A hotel suite with an evening city view, for booking ads.",
      "خطة محتوى شهرية لمجموعة فنادق: منشورات وإعلانات وحملات مواسم.": "A monthly content plan for a hotel group: posts, ads and seasonal campaigns.",
    },
  },
  "madinah.dates": {
    name: "Madinah Dates Digital",
    bio: "Launching online stores for dates and gifts: product photography and Snapchat and TikTok ads.",
    captions: {
      "تصوير علب هدايا تمر العجوة لمتجر إلكتروني في المدينة المنورة.": "Ajwa date gift boxes for an online store in Madinah.",
      "إعلان سناب شات: فتح علبة تمور فاخرة مع دلة القهوة.": "A Snapchat ad: opening a box of premium dates beside a coffee pot.",
      "تجهيز الطلبات لمتجر تمور إلكتروني: من التغليف إلى التوصيل.": "Preparing orders for an online date store: from packing to delivery.",
    },
  },
};
