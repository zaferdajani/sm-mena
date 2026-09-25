import json, re, sys
from collections import Counter

OUT = "data/service-catalog.json"

GROUPS = [
    ("social_media", "السوشيال ميديا", "Social media"),
    ("paid_media", "الإعلانات المدفوعة", "Paid advertising"),
    ("creative", "الإنتاج الإبداعي", "Creative production"),
    ("branding", "الهوية والعلامة التجارية", "Branding"),
    ("digital", "التسويق الرقمي والمتاجر", "Digital marketing and e-commerce"),
    ("offline", "الفعاليات والإعلانات على أرض الواقع", "Events and offline advertising"),
    ("strategy", "الاستراتيجية والأبحاث", "Strategy and research"),
    ("web_dev", "تطوير المواقع والتطبيقات", "Web and app development"),
    ("pr_comms", "العلاقات العامة والاتصال", "PR and communications"),
]

ROLES = [
    ("strategist", "مخطط استراتيجي", "Strategist"),
    ("social_media_manager", "مدير حسابات التواصل الاجتماعي", "Social media manager"),
    ("community_manager", "مدير مجتمع / مشرف ردود", "Community manager"),
    ("content_writer_ar", "كاتب محتوى عربي", "Arabic content writer"),
    ("content_writer_en", "كاتب محتوى إنجليزي", "English content writer"),
    ("graphic_designer", "مصمم جرافيك", "Graphic designer"),
    ("motion_designer", "مصمم موشن جرافيك", "Motion designer"),
    ("animator", "رسام أنيميشن", "Animator"),
    ("3d_artist", "مصمم ثلاثي الأبعاد", "3D artist"),
    ("photographer", "مصور فوتوغرافي", "Photographer"),
    ("videographer", "مصور فيديو", "Videographer"),
    ("video_editor", "مونتير / محرر فيديو", "Video editor"),
    ("drone_operator", "مصور درون", "Drone operator"),
    ("voice_over", "معلق صوتي", "Voice-over artist"),
    ("model_talent", "موديل / ممثل", "Model and on-camera talent"),
    ("content_creator", "صانع محتوى (UGC)", "Content creator (UGC)"),
    ("media_buyer", "مختص إعلانات ممولة (ميديا باير)", "Media buyer"),
    ("seo_specialist", "مختص سيو", "SEO specialist"),
    ("web_developer", "مطور مواقع وتطبيقات", "Web and app developer"),
    ("ui_ux_designer", "مصمم واجهات وتجربة مستخدم", "UI/UX designer"),
    ("data_analyst", "محلل بيانات تسويقية", "Marketing data analyst"),
    ("influencer_manager", "مدير علاقات المؤثرين", "Influencer manager"),
    ("pr_specialist", "مختص علاقات عامة", "PR specialist"),
    ("event_manager", "منظم فعاليات", "Event manager"),
    ("printing_production", "مسؤول الطباعة والإنتاج", "Print and production manager"),
]

CORE = ["smm_management", "smm_content", "smm_community", "smm_strategy", "smm_influencer",
        "ads_meta", "ads_tiktok", "ads_snapchat", "ads_google", "ads_linkedin",
        "video_production", "photography", "graphic_design", "copywriting", "motion_graphics",
        "brand_identity", "brand_strategy", "packaging_design",
        "seo", "email_marketing", "web_design", "analytics", "web_maintenance", "ecommerce_setup",
        "event_coverage", "print_design", "outdoor_ads", "activations"]
CORE_GROUP = {
    **{k: "social_media" for k in CORE[0:5]}, **{k: "paid_media" for k in CORE[5:10]},
    **{k: "creative" for k in CORE[10:15]}, **{k: "branding" for k in CORE[15:18]},
    **{k: "digital" for k in CORE[18:24]}, **{k: "offline" for k in CORE[24:28]},
}

# key, group, parent, name_ar, name_en, aliases, roles   (parent "" = self, for core keys)
S = []
def s(key, group, parent, ar, en, aliases, roles):
    S.append(dict(key=key, group=group, parent=parent or key, name_ar=ar, name_en=en,
                  aliases=aliases, roles=roles))

# ───────────── social_media ─────────────
G = "social_media"
s("smm_management", G, "", "إدارة حسابات التواصل الاجتماعي", "Social media account management",
  ["سوشيال ميديا", "إدارة صفحات", "ادارة سوشيال", "SMM", "سوشال", "جدولة ونشر"], ["social_media_manager", "graphic_designer", "content_writer_ar"])
s("smm_content", G, "", "صناعة محتوى السوشيال ميديا", "Social media content creation",
  ["كونتنت", "محتوى سوشيال", "صناعة محتوى", "content creation", "بوستات"], ["social_media_manager", "graphic_designer", "content_writer_ar"])
s("smm_community", G, "", "إدارة المجتمع والتفاعل", "Community management",
  ["الرد على التعليقات", "كوميونتي", "مودريشن", "community", "moderation"], ["community_manager"])
s("smm_strategy", G, "", "استراتيجية السوشيال ميديا", "Social media strategy",
  ["خطة سوشيال", "استراتيجية سوشيال", "social strategy", "خطة تواصل"], ["strategist", "social_media_manager"])
s("smm_influencer", G, "", "التسويق عبر المؤثرين", "Influencer marketing campaigns",
  ["مؤثرين", "مشاهير", "انفلونسر", "influencers", "إعلانات المشاهير", "بلوقرز"], ["influencer_manager"])
s("content_calendar", G, "smm_strategy", "خطة المحتوى الشهرية", "Monthly content calendar",
  ["كالندر", "خطة محتوى", "content plan", "جدول النشر", "content calendar"], ["social_media_manager", "strategist"])
s("instagram_management", G, "smm_management", "إدارة حساب إنستغرام", "Instagram account management",
  ["انستا", "انستقرام", "إنستجرام", "IG", "Instagram"], ["social_media_manager"])
s("tiktok_management", G, "smm_management", "إدارة حساب تيك توك", "TikTok account management",
  ["تيك توك", "تك توك", "تيكتوك", "TikTok", "TT"], ["social_media_manager", "video_editor"])
s("snapchat_management", G, "smm_management", "إدارة حساب سناب شات", "Snapchat account management",
  ["سناب", "سنابات", "Snap", "Snapchat", "بروفايل عام"], ["social_media_manager", "content_creator"])
s("facebook_page_management", G, "smm_management", "إدارة صفحة فيسبوك", "Facebook page management",
  ["فيس", "فيسبوك", "فيس بوك", "FB", "Facebook"], ["social_media_manager"])
s("x_twitter_management", G, "smm_management", "إدارة حساب إكس (تويتر)", "X (Twitter) account management",
  ["تويتر", "إكس", "تغريدات", "Twitter", "X"], ["social_media_manager", "content_writer_ar"])
s("linkedin_management", G, "smm_management", "إدارة صفحة لينكدإن", "LinkedIn page management",
  ["لينكد ان", "لينكدإن", "LinkedIn", "B2B"], ["social_media_manager", "content_writer_en"])
s("youtube_channel_management", G, "smm_management", "إدارة قناة يوتيوب", "YouTube channel management",
  ["يوتيوب", "قناة يوتيوب", "YouTube", "يوتيوبر", "YouTube SEO"], ["social_media_manager", "video_editor"])
s("social_account_setup", G, "smm_management", "إنشاء وتجهيز الحسابات", "Social account setup and profile optimization",
  ["فتح حسابات", "إنشاء حساب", "تجهيز البروفايل", "bio", "بايو"], ["social_media_manager"])
s("account_verification", G, "smm_management", "توثيق الحسابات (العلامة الزرقاء)", "Account verification (blue badge)",
  ["توثيق", "توثيق حساب", "بلو تك", "blue tick", "verified"], ["social_media_manager"])
s("account_recovery", G, "smm_management", "استرجاع الحسابات المسروقة أو المعطلة", "Hacked or disabled account recovery",
  ["استرجاع حساب", "حساب مهكر", "فك حظر", "account recovery", "hacked"], ["social_media_manager", "media_buyer"])
s("social_audit", G, "smm_strategy", "تقييم وتدقيق حسابات السوشيال", "Social media audit",
  ["تدقيق حسابات", "تقييم الحساب", "audit", "social audit"], ["strategist", "social_media_manager"])
s("social_listening", G, "smm_community", "الرصد الاجتماعي وتحليل الانطباعات", "Social listening and sentiment analysis",
  ["رصد", "مراقبة السوشيال", "social listening", "sentiment", "رصد إعلامي", "media monitoring"], ["data_analyst", "community_manager"])
s("social_customer_service", G, "smm_community", "خدمة العملاء عبر السوشيال ميديا", "Customer service on social media",
  ["الرد على الرسائل", "انبوكس", "الخاص", "DMs", "customer care"], ["community_manager"])
s("chatbot_setup", G, "smm_community", "الردود الآلية والشات بوت", "Chatbot and auto-reply setup",
  ["شات بوت", "ردود آلية", "ManyChat", "chatbot", "auto reply"], ["web_developer", "community_manager"])
s("ugc_content", G, "smm_content", "محتوى صناع المحتوى (UGC)", "UGC content (user-generated style videos)",
  ["يو جي سي", "UGC", "محتوى مستخدمين", "فيديو تجربة منتج", "UGC ads"], ["content_creator", "video_editor"])
s("trend_content", G, "smm_content", "محتوى الترندات والتفاعل اللحظي", "Trend and real-time content",
  ["ترند", "ترندات", "trends", "real-time", "ميمز"], ["social_media_manager", "content_writer_ar"])
s("social_contests", G, "smm_content", "المسابقات والسحوبات على السوشيال", "Social contests and giveaways",
  ["مسابقات", "سحب", "قيف اواي", "giveaway", "هدايا"], ["social_media_manager", "community_manager"])
s("social_live_streaming", G, "smm_management", "إدارة البث المباشر على المنصات", "Social live streaming (Instagram, TikTok, YouTube Live)",
  ["لايف", "بث مباشر", "لايف تيك توك", "live", "Instagram Live"], ["social_media_manager", "videographer"])
s("organic_growth", G, "smm_management", "نمو الحسابات العضوي", "Organic account growth",
  ["زيادة متابعين", "نمو الحساب", "growth", "تفاعل", "reach"], ["social_media_manager", "strategist"])
s("social_reporting", G, "analytics", "تقارير أداء السوشيال ميديا", "Social media performance reports",
  ["تقرير شهري", "تقارير سوشيال", "insights", "reporting"], ["social_media_manager", "data_analyst"])
s("influencer_sourcing", G, "smm_influencer", "البحث عن المؤثرين واختيارهم", "Influencer sourcing and vetting",
  ["اختيار مؤثرين", "ترشيح مشاهير", "sourcing", "vetting", "قائمة مؤثرين"], ["influencer_manager"])
s("micro_influencer_campaigns", G, "smm_influencer", "حملات المؤثرين الصغار (مايكرو ونانو)", "Micro and nano influencer campaigns",
  ["مايكرو", "نانو", "micro influencers", "نانو انفلونسر"], ["influencer_manager"])
s("celebrity_endorsements", G, "smm_influencer", "التعاقد مع المشاهير", "Celebrity endorsements",
  ["سنابات مشاهير", "إعلان مشهور", "celebrity", "مشهور", "سفير العلامة"], ["influencer_manager", "pr_specialist"])
s("influencer_seeding", G, "smm_influencer", "إرسال المنتجات للمؤثرين (Seeding)", "Influencer seeding and gifting",
  ["سيدنق", "هدايا المؤثرين", "PR box", "gifting", "seeding"], ["influencer_manager", "pr_specialist"])
s("creator_talent_management", G, "smm_influencer", "إدارة أعمال صناع المحتوى", "Creator and talent management",
  ["إدارة مشاهير", "مدير أعمال", "talent management", "إدارة مؤثر"], ["influencer_manager"])

# ───────────── paid_media ─────────────
G = "paid_media"
s("ads_meta", G, "", "إعلانات فيسبوك وإنستغرام (ميتا)", "Meta ads (Facebook and Instagram)",
  ["ميتا", "إعلانات ممولة", "تمويل", "بوست ممول", "FB ads", "sponsored"], ["media_buyer"])
s("ads_tiktok", G, "", "إعلانات تيك توك", "TikTok ads",
  ["اعلان تيك توك", "TikTok Ads", "Spark Ads", "سبارك", "ترويج تيك توك"], ["media_buyer"])
s("ads_snapchat", G, "", "إعلانات سناب شات", "Snapchat ads",
  ["اعلان سناب", "Snap Ads", "Snapchat Ads", "سناب ادز"], ["media_buyer"])
s("ads_google", G, "", "إعلانات جوجل (البحث)", "Google Ads (Search)",
  ["قوقل ادز", "جوجل ادز", "Google Ads", "PPC", "SEM", "adwords"], ["media_buyer"])
s("ads_linkedin", G, "", "إعلانات لينكدإن", "LinkedIn ads",
  ["اعلان لينكد ان", "LinkedIn Ads", "B2B ads", "InMail"], ["media_buyer"])
s("ads_x", G, "ads_meta", "إعلانات إكس (تويتر)", "X (Twitter) ads",
  ["اعلان تويتر", "X Ads", "Twitter Ads", "ترويج تغريدة"], ["media_buyer"])
s("ads_youtube", G, "ads_google", "إعلانات يوتيوب", "YouTube ads",
  ["اعلان يوتيوب", "YouTube Ads", "TrueView", "Shorts ads"], ["media_buyer"])
s("google_display_ads", G, "ads_google", "إعلانات الشبكة الإعلانية (بانرات جوجل)", "Google Display Network ads",
  ["GDN", "Display", "بانرات", "ديسبلاي", "Demand Gen"], ["media_buyer", "graphic_designer"])
s("google_shopping_pmax", G, "ads_google", "إعلانات جوجل للتسوق وPerformance Max", "Google Shopping and Performance Max",
  ["شوبينج", "PMax", "Performance Max", "Google Shopping", "Merchant Center"], ["media_buyer"])
s("app_install_campaigns", G, "ads_google", "حملات تحميل التطبيقات", "App install campaigns (Google App, Apple Search Ads)",
  ["تحميل تطبيق", "App campaigns", "UAC", "Apple Search Ads", "installs"], ["media_buyer"])
s("programmatic_ads", G, "ads_google", "الإعلانات البرمجية", "Programmatic advertising (DSP)",
  ["برمجية", "programmatic", "DV360", "DSP", "بروجراماتيك"], ["media_buyer"])
s("native_publisher_ads", G, "ads_google", "الإعلانات المحلية في المواقع الإخبارية", "Native and publisher ads (Taboola, Outbrain)",
  ["تابولا", "Taboola", "Outbrain", "native ads", "مواقع إخبارية"], ["media_buyer"])
s("marketplace_ads", G, "ads_google", "إعلانات المنصات والمتاجر (أمازون، نون، طلبات)", "Marketplace and retail media ads",
  ["اعلانات أمازون", "اعلانات نون", "طلبات", "sponsored products", "retail media"], ["media_buyer"])
s("audio_streaming_ads", G, "ads_google", "إعلانات أنغامي وسبوتيفاي", "Audio streaming ads (Anghami, Spotify)",
  ["أنغامي", "سبوتيفاي", "Anghami", "Spotify", "إعلان صوتي"], ["media_buyer", "voice_over"])
s("media_planning", G, "ads_meta", "التخطيط الإعلامي وتوزيع الميزانية", "Media planning and budget allocation",
  ["ميديا بلان", "media plan", "توزيع الميزانية", "خطة إعلانية"], ["media_buyer", "strategist"])
s("media_buying", G, "ads_meta", "شراء المساحات الإعلانية", "Media buying",
  ["ميديا باينج", "media buying", "شراء إعلاني", "حجز إعلانات"], ["media_buyer"])
s("performance_marketing", G, "ads_meta", "التسويق بالأداء", "Performance marketing",
  ["بيرفورمانس", "performance", "ROAS", "حملات مبيعات", "conversion ads"], ["media_buyer", "data_analyst"])
s("lead_generation_ads", G, "ads_meta", "حملات جمع العملاء المحتملين", "Lead generation campaigns",
  ["ليدز", "leads", "عملاء محتملين", "جمع بيانات", "lead gen"], ["media_buyer"])
s("click_to_whatsapp_ads", G, "ads_meta", "إعلانات الرسائل والواتساب", "Click-to-WhatsApp and messaging ads",
  ["اعلان واتساب", "إعلان رسائل", "CTWA", "messages ads", "ماسنجر"], ["media_buyer"])
s("retargeting", G, "ads_meta", "إعادة الاستهداف", "Retargeting and remarketing",
  ["ريتارجت", "إعادة استهداف", "retargeting", "remarketing", "ريماركتنج"], ["media_buyer"])
s("ad_account_setup", G, "ads_meta", "إنشاء وإعداد الحسابات الإعلانية", "Ad account and Business Manager setup",
  ["بيزنس مانجر", "Business Manager", "حساب إعلاني", "إدارة الأعمال", "ad account"], ["media_buyer"])
s("pixel_tracking_setup", G, "analytics", "ربط البكسل وتتبع التحويلات", "Pixel and conversion tracking setup",
  ["بكسل", "pixel", "CAPI", "API التحويلات", "تتبع التحويلات", "conversion tracking"], ["media_buyer", "web_developer"])
s("ad_creatives", G, "graphic_design", "تصميم الإعلانات الممولة (صور وفيديو)", "Ad creatives (static and video)",
  ["كريتيف", "تصاميم إعلانية", "ad creatives", "بانر إعلاني", "كريتفز"], ["graphic_designer", "video_editor"])
s("ads_audit", G, "ads_meta", "تدقيق وتحسين الحملات الإعلانية", "Paid ads audit and optimization",
  ["تدقيق إعلانات", "تحسين الحملات", "ads audit", "optimization", "A/B", "اختبار إعلانات"], ["media_buyer", "data_analyst"])

# ───────────── creative ─────────────
G = "creative"
s("video_production", G, "", "إنتاج الفيديو", "Video production",
  ["فيديو", "تصوير فيديو", "برومو", "بروموشن", "production", "إنتاج"], ["videographer", "video_editor"])
s("photography", G, "", "التصوير الفوتوغرافي", "Photography",
  ["تصوير", "مصور", "فوتوغرافي", "photo", "فوتو", "photoshoot"], ["photographer"])
s("graphic_design", G, "", "التصميم الجرافيكي", "Graphic design",
  ["تصميم", "جرافيك", "ديزاين", "design", "فوتوشوب", "مصمم"], ["graphic_designer"])
s("copywriting", G, "", "كتابة المحتوى الإعلاني", "Copywriting",
  ["كوبي رايتنج", "كتابة إعلانية", "copy", "كتابة محتوى", "كوبي"], ["content_writer_ar", "content_writer_en"])
s("motion_graphics", G, "", "الموشن جرافيك", "Motion graphics",
  ["موشن", "موشن جرافيك", "motion", "فيديو متحرك", "After Effects"], ["motion_designer"])
# video
s("reels_editing", G, "video_production", "مونتاج الريلز وفيديوهات تيك توك", "Reels and TikTok video editing",
  ["ريلز", "ريل", "شورتس", "مونتاج ريلز", "Shorts", "short-form"], ["video_editor"])
s("reels_shooting", G, "video_production", "تصوير الريلز والفيديوهات القصيرة", "Reels and short-form video shooting",
  ["تصوير ريلز", "تصوير تيك توك", "short video", "فيديو قصير"], ["videographer", "content_creator"])
s("video_editing", G, "video_production", "مونتاج الفيديو", "Video editing",
  ["مونتاج", "ايديت", "مونتير", "تعديل فيديو", "editing", "تلوين"], ["video_editor"])
s("tvc_production", G, "video_production", "إنتاج الإعلانات التلفزيونية", "TV commercial (TVC) production",
  ["TVC", "إعلان تلفزيوني", "كومرشال", "commercial", "إعلان سينمائي"], ["videographer", "video_editor", "model_talent"])
s("corporate_video", G, "video_production", "الفيديو التعريفي للشركات", "Corporate and company profile video",
  ["فيديو تعريفي", "فيديو بروفايل", "corporate video", "فيلم تعريفي"], ["videographer", "video_editor"])
s("brand_documentary", G, "video_production", "الأفلام الوثائقية وأفلام العلامة", "Documentaries and brand films",
  ["وثائقي", "فيلم قصير", "documentary", "brand film"], ["videographer", "video_editor", "content_writer_ar"])
s("product_video", G, "video_production", "فيديوهات المنتجات", "Product videos and demos",
  ["فيديو منتج", "انبوكسنق", "unboxing", "product demo", "ديمو"], ["videographer", "video_editor"])
s("testimonial_videos", G, "video_production", "فيديوهات آراء العملاء", "Customer testimonial videos",
  ["آراء العملاء", "تجارب العملاء", "testimonials", "ريفيو"], ["videographer", "video_editor"])
s("youtube_video_production", G, "video_production", "إنتاج فيديوهات يوتيوب الطويلة", "YouTube long-form video production",
  ["فيديو يوتيوب", "حلقات", "برنامج يوتيوب", "long-form"], ["videographer", "video_editor"])
s("educational_video", G, "video_production", "الفيديوهات التعليمية والدورات", "Educational and e-learning videos",
  ["كورس", "دورة مصورة", "تعليمي", "e-learning", "شرح"], ["videographer", "video_editor"])
s("podcast_production", G, "video_production", "إنتاج البودكاست", "Podcast production (audio and video)",
  ["بودكاست", "podcast", "فودكاست", "vodcast", "استوديو بودكاست"], ["videographer", "video_editor", "voice_over"])
s("drone_videography", G, "video_production", "التصوير الجوي بالدرون", "Drone aerial photography and video",
  ["درون", "طائرة تصوير", "تصوير جوي", "aerial", "drone"], ["drone_operator"])
s("construction_timelapse", G, "video_production", "توثيق المشاريع والتايم لابس", "Construction progress and time-lapse filming",
  ["تايم لابس", "time-lapse", "توثيق مشاريع", "توثيق إنشائي"], ["videographer", "drone_operator"])
s("video_scriptwriting", G, "copywriting", "كتابة سكربت الفيديو", "Video scriptwriting",
  ["سكربت", "سيناريو", "اسكريبت", "script", "كتابة سيناريو", "ستوري بورد"], ["content_writer_ar", "content_writer_en"])
s("vfx_compositing", G, "video_production", "المؤثرات البصرية", "VFX and compositing",
  ["مؤثرات", "VFX", "كروما", "green screen", "مؤثرات بصرية"], ["video_editor", "3d_artist"])
s("subtitling", G, "video_production", "ترجمة الفيديو والسبتايتل", "Subtitling and video captions",
  ["سبتايتل", "ترجمة فيديو", "subtitles", "SRT", "كابشن فيديو"], ["video_editor", "content_writer_en"])
s("voice_over_arabic", G, "video_production", "التعليق الصوتي بالعربية", "Arabic voice-over",
  ["فويس اوفر", "تعليق صوتي", "صوت خليجي", "VO", "لهجة سعودية", "صوت فصحى"], ["voice_over"])
s("voice_over_english", G, "video_production", "التعليق الصوتي بالإنجليزية", "English voice-over",
  ["فويس انجليزي", "English VO", "voice over", "voiceover"], ["voice_over"])
s("dubbing", G, "video_production", "الدبلجة", "Dubbing and audio localization",
  ["دبلجة", "dubbing", "lip sync", "تعريب صوتي"], ["voice_over", "video_editor"])
s("music_jingles", G, "video_production", "الموسيقى والجنجل الإعلاني", "Music, jingles and sound design",
  ["جنجل", "موسيقى", "jingle", "هندسة صوت", "شيلة", "هوية صوتية"], ["video_editor", "voice_over"])
s("model_casting", G, "video_production", "توفير الموديلز والممثلين", "Model and actor casting",
  ["موديل", "مودل", "كاستنج", "ممثلين", "casting", "موديلز"], ["model_talent"])
s("presenter_talent", G, "video_production", "مقدمو المحتوى والمذيعون", "Presenters and on-camera hosts",
  ["مقدم", "مذيع", "بريزنتر", "presenter", "host", "مقدمة"], ["model_talent", "content_creator"])
s("equipment_rental", G, "video_production", "تأجير معدات التصوير", "Camera and production equipment rental",
  ["تأجير كاميرات", "معدات تصوير", "إضاءة", "rental", "gear"], ["videographer"])
s("studio_rental", G, "photography", "تأجير استوديو التصوير", "Photo and video studio rental",
  ["استوديو", "studio", "تأجير استوديو", "سايكلوراما"], ["photographer", "videographer"])
s("ai_video", G, "video_production", "فيديوهات الذكاء الاصطناعي", "AI-generated video and avatars",
  ["فيديو AI", "ذكاء اصطناعي", "افاتار", "AI video", "Veo", "Sora"], ["video_editor", "motion_designer"])
# motion / animation / 3D
s("animation_2d", G, "motion_graphics", "الأنيميشن ثنائي الأبعاد", "2D animation",
  ["2D", "كرتون", "رسوم متحركة", "انيميشن", "animation", "تحريك شخصيات"], ["animator"])
s("animation_3d", G, "motion_graphics", "الأنيميشن ثلاثي الأبعاد", "3D animation",
  ["3D", "ثري دي", "ثلاثي الأبعاد", "Blender", "Cinema 4D"], ["3d_artist", "animator"])
s("explainer_video", G, "motion_graphics", "فيديوهات الشرح (إكسبلينر)", "Explainer videos",
  ["فيديو شرح", "اكسبلينر", "explainer", "انفوجرافيك متحرك", "وايت بورد", "whiteboard"], ["motion_designer", "voice_over"])
s("logo_animation", G, "motion_graphics", "تحريك الشعار والمقدمات", "Logo animation and intros",
  ["انترو", "intro", "تحريك لوجو", "لوجو موشن", "outro"], ["motion_designer"])
s("animated_social_posts", G, "motion_graphics", "التصاميم المتحركة للسوشيال", "Animated social posts",
  ["بوست متحرك", "موشن بوست", "GIF", "animated post", "ستوري متحرك"], ["motion_designer"])
s("stickers_gifs", G, "motion_graphics", "ملصقات وصور GIF مخصصة", "Custom stickers and GIFs",
  ["ستيكرات واتساب", "ملصقات", "GIPHY", "stickers", "جيف"], ["motion_designer", "graphic_designer"])
s("e_invitations", G, "motion_graphics", "الدعوات الإلكترونية وفيديوهات التهنئة", "E-invitations and greeting videos",
  ["دعوة إلكترونية", "بطاقة دعوة", "دعوة زواج", "تهنئة", "invitation"], ["motion_designer", "graphic_designer"])
s("cgi_fooh_ads", G, "motion_graphics", "إعلانات CGI والواقع المدمج (FOOH)", "CGI and FOOH ads",
  ["CGI", "FOOH", "فوه", "إعلان ثلاثي الأبعاد", "fake out of home"], ["3d_artist"])
s("product_3d_renders", G, "graphic_design", "المجسمات والرندر ثلاثي الأبعاد للمنتجات", "3D product renders and visualization",
  ["رندر", "ريندر", "3D render", "مجسم", "موك اب 3D", "CGI منتجات"], ["3d_artist"])
s("architectural_visualization", G, "graphic_design", "الإظهار المعماري ثلاثي الأبعاد", "Architectural and interior 3D visualization",
  ["إظهار معماري", "رندر داخلي", "archviz", "3D عقاري", "Lumion"], ["3d_artist"])
s("ar_filters_lenses", G, "ads_snapchat", "فلاتر وعدسات الواقع المعزز", "AR filters and lenses (Snapchat, Instagram, TikTok)",
  ["فلتر", "عدسة سناب", "لنس", "AR filter", "Lens Studio", "Effect House"], ["3d_artist", "motion_designer"])
# photography
s("product_photography", G, "photography", "تصوير المنتجات", "Product photography",
  ["تصوير منتجات", "باك شوت", "packshot", "خلفية بيضاء", "ecommerce photos", "تصوير 360"], ["photographer"])
s("food_photography", G, "photography", "تصوير الأطعمة والمطاعم", "Food and restaurant photography",
  ["تصوير أكل", "تصوير منيو", "تصوير مطاعم", "food", "كافيهات"], ["photographer"])
s("fashion_photography", G, "photography", "تصوير الأزياء والموديلات", "Fashion and model photography",
  ["فاشن", "موديل", "لوك بوك", "lookbook", "عبايات"], ["photographer", "model_talent"])
s("perfume_jewelry_photography", G, "photography", "تصوير العطور والمجوهرات", "Perfume, jewelry and luxury photography",
  ["عطور", "مجوهرات", "ساعات", "بخور", "luxury"], ["photographer"])
s("lifestyle_photography", G, "photography", "التصوير الترويجي (لايف ستايل)", "Lifestyle and campaign photography",
  ["لايف ستايل", "lifestyle", "حملة تصوير", "campaign shoot"], ["photographer", "model_talent"])
s("corporate_headshots", G, "photography", "التصوير الرسمي والبورتريه للموظفين", "Corporate headshots and portraits",
  ["هيدشوت", "بورتريه", "headshot", "صور الموظفين", "صورة رسمية"], ["photographer"])
s("real_estate_photography", G, "photography", "تصوير العقارات والفنادق", "Real estate and hospitality photography",
  ["عقارات", "فنادق", "تصوير داخلي", "interiors", "شاليهات"], ["photographer", "drone_operator"])
s("virtual_tours_360", G, "photography", "الجولات الافتراضية 360", "360 virtual tours",
  ["جولة افتراضية", "360 tour", "ماتربورت", "Matterport", "virtual tour"], ["photographer"])
s("automotive_photography", G, "photography", "تصوير السيارات", "Automotive photography",
  ["سيارات", "معارض سيارات", "car shoot", "automotive"], ["photographer", "videographer"])
s("wedding_photography", G, "photography", "تصوير الأعراس والمناسبات الخاصة", "Wedding and private occasion photography",
  ["أعراس", "زفاف", "ملكة", "خطوبة", "wedding"], ["photographer", "videographer"])
s("womens_event_photography", G, "photography", "التصوير النسائي للمناسبات", "Female photographer for women-only events",
  ["مصورة", "تصوير نسائي", "مصورة أعراس", "female photographer"], ["photographer"])
s("family_portrait_photography", G, "photography", "تصوير العائلات والأطفال والمواليد", "Family, kids and newborn photography",
  ["مواليد", "أطفال", "عائلي", "newborn", "family"], ["photographer"])
s("photo_styling", G, "photography", "التنسيق والستايلنج للتصوير", "Food, product and fashion styling",
  ["ستايلست", "ستايلنج", "food stylist", "تنسيق", "prop styling"], ["photographer"])
s("photo_retouching", G, "photography", "تعديل الصور والريتاتش", "Photo retouching and editing",
  ["ريتاتش", "تعديل صور", "قص خلفية", "retouch", "إزالة خلفية"], ["graphic_designer", "photographer"])
# graphic design
s("social_post_design", G, "graphic_design", "تصميم منشورات وستوريات السوشيال", "Social post, story and carousel design",
  ["تصاميم سوشيال", "بوست", "ستوري", "كاروسيل", "post design", "carousel"], ["graphic_designer"])
s("infographic_design", G, "graphic_design", "تصميم الإنفوجرافيك", "Infographic design",
  ["انفوجرافيك", "infographic", "رسوم بيانية", "data viz"], ["graphic_designer"])
s("presentation_design", G, "graphic_design", "تصميم العروض التقديمية", "Presentation and pitch deck design",
  ["بوربوينت", "عرض تقديمي", "pitch deck", "PPT", "كينوت", "بريزنتيشن"], ["graphic_designer"])
s("company_profile", G, "graphic_design", "البروفايل التعريفي للشركة", "Company profile (writing and design)",
  ["بروفايل", "كومباني بروفايل", "ملف تعريفي", "company profile", "بروفايل شركة"], ["graphic_designer", "content_writer_ar"])
s("illustration", G, "graphic_design", "الرسم الرقمي والإليستريشن", "Illustration",
  ["رسم", "اليستريشن", "illustration", "رسومات", "رسم رقمي"], ["graphic_designer"])
s("character_mascot_design", G, "graphic_design", "تصميم الشخصيات والتميمة (الماسكوت)", "Character and mascot design",
  ["ماسكوت", "شخصية كرتونية", "mascot", "character", "تميمة"], ["graphic_designer", "animator"])
s("arabic_calligraphy", G, "graphic_design", "الخط العربي والتايبوجرافي", "Arabic calligraphy and custom typography",
  ["خط عربي", "كاليغرافي", "تايبوجرافي", "خطاط", "فونت عربي", "calligraphy"], ["graphic_designer"])
s("youtube_thumbnails", G, "graphic_design", "تصميم الصور المصغرة ليوتيوب", "YouTube thumbnail design",
  ["ثمبنيل", "thumbnail", "صورة مصغرة", "غلاف فيديو"], ["graphic_designer"])
s("ai_image_generation", G, "graphic_design", "صور وتصاميم بالذكاء الاصطناعي", "AI image generation and visuals",
  ["صور AI", "ميدجورني", "Midjourney", "ذكاء اصطناعي", "AI visuals"], ["graphic_designer"])
s("menu_design", G, "print_design", "تصميم المنيو", "Restaurant menu design",
  ["منيو", "قائمة طعام", "menu", "منيو مطعم"], ["graphic_designer"])
s("publication_design", G, "print_design", "تصميم التقارير السنوية والمجلات والكتيبات", "Annual report, magazine and booklet design",
  ["تقرير سنوي", "مجلة", "كتيب", "annual report", "كتالوج"], ["graphic_designer"])
# writing
s("arabic_copywriting", G, "copywriting", "كتابة المحتوى العربي", "Arabic copywriting",
  ["كتابة عربي", "كوبي عربي", "محتوى عربي", "فصحى", "Arabic copy"], ["content_writer_ar"])
s("english_copywriting", G, "copywriting", "كتابة المحتوى الإنجليزي", "English copywriting",
  ["كتابة انجليزي", "English copy", "copywriter", "محتوى انجليزي"], ["content_writer_en"])
s("dialect_copywriting", G, "copywriting", "الكتابة باللهجات المحلية", "Dialect copywriting (Saudi, Gulf, Egyptian, Levantine)",
  ["لهجة", "خليجي", "سعودي", "مصري", "شامي", "عامية"], ["content_writer_ar"])
s("caption_writing", G, "copywriting", "كتابة الكابشن والهاشتاقات", "Caption and hashtag writing",
  ["كابشن", "هاشتاق", "caption", "hashtags", "وصف البوست"], ["content_writer_ar", "social_media_manager"])
s("website_copywriting", G, "copywriting", "كتابة محتوى المواقع", "Website copywriting",
  ["محتوى موقع", "نصوص الموقع", "web copy", "من نحن"], ["content_writer_ar", "content_writer_en"])
s("product_descriptions", G, "copywriting", "كتابة أوصاف المنتجات", "Product description writing",
  ["وصف منتجات", "product descriptions", "وصف متجر", "listing copy"], ["content_writer_ar"])
s("slogans_taglines", G, "copywriting", "كتابة السلوقن والعبارات التسويقية", "Slogans and taglines",
  ["سلوقن", "سلوجن", "تاق لاين", "slogan", "tagline"], ["content_writer_ar", "strategist"])
s("speechwriting", G, "copywriting", "كتابة الخطابات والكلمات الرسمية", "Speechwriting and ghostwriting",
  ["خطاب", "كلمة رسمية", "كتابة بالنيابة", "ghostwriting", "speech"], ["content_writer_ar", "pr_specialist"])
s("translation_localization", G, "copywriting", "الترجمة والتعريب التسويقي", "Translation and marketing localization (AR/EN)",
  ["ترجمة", "تعريب", "localization", "ترانسكرييشن", "transcreation"], ["content_writer_ar", "content_writer_en"])
s("proofreading", G, "copywriting", "التدقيق اللغوي والتحرير", "Proofreading and editing",
  ["تدقيق", "مراجعة لغوية", "proofreading", "تحرير", "تدقيق إملائي"], ["content_writer_ar", "content_writer_en"])
s("ai_content_writing", G, "copywriting", "كتابة المحتوى بمساعدة الذكاء الاصطناعي", "AI-assisted content writing",
  ["ChatGPT", "شات جي بي تي", "كتابة AI", "ذكاء اصطناعي", "AI content"], ["content_writer_ar", "content_writer_en"])

# ───────────── branding ─────────────
G = "branding"
s("brand_identity", G, "", "تصميم الهوية البصرية", "Brand identity design",
  ["هوية", "براندنج", "هوية تجارية", "branding", "visual identity"], ["graphic_designer"])
s("brand_strategy", G, "", "استراتيجية العلامة التجارية", "Brand strategy",
  ["استراتيجية براند", "brand strategy", "بناء العلامة", "استراتيجية العلامة"], ["strategist"])
s("packaging_design", G, "", "تصميم التغليف", "Packaging design",
  ["تغليف", "باكجنج", "علب", "packaging", "عبوات"], ["graphic_designer", "3d_artist"])
s("logo_design", G, "brand_identity", "تصميم الشعار (اللوقو)", "Logo design",
  ["لوقو", "لوجو", "لوغو", "شعار", "logo"], ["graphic_designer"])
s("brand_guidelines", G, "brand_identity", "دليل استخدام الهوية", "Brand guidelines (brand book)",
  ["براند بوك", "جايدلاين", "دليل الهوية", "brand book", "guidelines"], ["graphic_designer"])
s("rebranding", G, "brand_identity", "إعادة بناء الهوية وتحديثها", "Rebranding and brand refresh",
  ["ريبراند", "تجديد الهوية", "rebrand", "brand refresh"], ["graphic_designer", "strategist"])
s("stationery_design", G, "brand_identity", "تصميم القرطاسية وبطاقات العمل", "Stationery and business card design",
  ["كروت شخصية", "بزنس كارد", "قرطاسية", "ورق رسمي", "stationery"], ["graphic_designer"])
s("label_design", G, "packaging_design", "تصميم الملصقات والليبل للمنتجات", "Product label and sticker design",
  ["ليبل", "ستيكر منتج", "ملصق", "label", "sticker"], ["graphic_designer"])
s("retail_interior_branding", G, "brand_identity", "هوية المحلات والتصميم الداخلي التجاري", "Retail and interior branding",
  ["واجهة محل", "ديكور محل", "جداريات", "wall graphics", "store design"], ["graphic_designer", "3d_artist"])
s("brand_naming", G, "brand_strategy", "اختيار اسم العلامة التجارية", "Brand naming",
  ["تسمية", "اسم تجاري", "اسم شركة", "naming", "اقتراح أسماء"], ["strategist", "content_writer_ar"])
s("brand_positioning", G, "brand_strategy", "التموضع وقصة العلامة", "Brand positioning and storytelling",
  ["تموضع", "positioning", "قصة العلامة", "storytelling", "رسالة العلامة"], ["strategist"])
s("brand_voice", G, "brand_strategy", "نبرة صوت العلامة", "Brand voice and tone guide",
  ["نبرة", "tone of voice", "brand voice", "شخصية العلامة"], ["strategist", "content_writer_ar"])
s("personal_branding", G, "brand_strategy", "بناء العلامة الشخصية", "Personal branding for founders and executives",
  ["براند شخصي", "علامة شخصية", "personal brand", "بناء اسم", "thought leadership"], ["strategist", "content_writer_ar"])
s("employer_branding", G, "brand_strategy", "العلامة التجارية لجهة العمل", "Employer branding",
  ["employer branding", "استقطاب المواهب", "توظيف", "بيئة العمل"], ["strategist", "content_writer_en"])
s("trademark_registration", G, "brand_identity", "تسجيل العلامة التجارية", "Trademark registration support",
  ["تسجيل علامة", "حماية العلامة", "trademark", "براءة"], ["strategist"])

# ───────────── digital ─────────────
G = "digital"
s("seo", G, "", "تحسين محركات البحث (السيو)", "SEO",
  ["سيو", "SEO", "تصدر جوجل", "تصدر قوقل", "محركات البحث", "أرشفة"], ["seo_specialist"])
s("arabic_seo", G, "seo", "السيو العربي", "Arabic SEO",
  ["سيو عربي", "كلمات مفتاحية عربية", "Arabic SEO", "أرشفة عربية"], ["seo_specialist", "content_writer_ar"])
s("technical_seo", G, "seo", "السيو التقني وسرعة الموقع", "Technical SEO and site speed",
  ["سيو تقني", "technical SEO", "سرعة الموقع", "Core Web Vitals", "schema"], ["seo_specialist", "web_developer"])
s("local_seo", G, "seo", "السيو المحلي", "Local SEO",
  ["سيو محلي", "Local SEO", "ظهور بالمنطقة", "near me", "Apple Maps"], ["seo_specialist"])
s("google_business_profile", G, "seo", "تحسين ملف النشاط التجاري على جوجل", "Google Business Profile optimization",
  ["قوقل ماب", "جوجل ماب", "خرائط جوجل", "GMB", "Google Maps", "تقييمات جوجل"], ["seo_specialist"])
s("seo_content_writing", G, "seo", "كتابة مقالات السيو والمدونات", "SEO articles and blog writing",
  ["مقالات سيو", "مقالات", "مدونة", "blog", "SEO content"], ["content_writer_ar", "seo_specialist"])
s("link_building", G, "seo", "بناء الروابط الخلفية", "Link building and backlinks",
  ["باك لينك", "روابط خلفية", "backlinks", "link building", "مقالات ضيف"], ["seo_specialist"])
s("seo_audit", G, "seo", "تدقيق السيو وتحليل الكلمات المفتاحية", "SEO audit and keyword research",
  ["تدقيق سيو", "كلمات مفتاحية", "keyword research", "SEO audit"], ["seo_specialist"])
s("app_store_optimization", G, "seo", "تحسين الظهور في متاجر التطبيقات", "App store optimization (ASO)",
  ["ASO", "آب ستور", "جوجل بلاي", "App Store", "متجر التطبيقات"], ["seo_specialist"])
s("ai_search_optimization", G, "seo", "تحسين الظهور في محركات الذكاء الاصطناعي", "AI search optimization (GEO/AEO)",
  ["GEO", "AEO", "ظهور في ChatGPT", "AI Overviews", "سيو الذكاء الاصطناعي"], ["seo_specialist", "content_writer_ar"])
s("email_marketing", G, "", "التسويق عبر البريد الإلكتروني", "Email marketing",
  ["ايميل", "إيميل ماركتنج", "نشرة بريدية", "newsletter", "Mailchimp", "email"], ["content_writer_ar", "graphic_designer"])
s("email_automation", G, "email_marketing", "الرسائل البريدية الآلية", "Email automation flows",
  ["فلو", "Klaviyo", "سلة متروكة", "abandoned cart", "automation"], ["web_developer", "content_writer_en"])
s("email_template_design", G, "email_marketing", "تصميم قوالب البريد الإلكتروني", "Email template design",
  ["قالب ايميل", "تصميم نشرة", "email template", "HTML email"], ["graphic_designer", "web_developer"])
s("whatsapp_marketing", G, "email_marketing", "التسويق عبر واتساب للأعمال", "WhatsApp Business marketing and broadcasts",
  ["واتساب", "واتس", "رسائل جماعية", "برودكاست", "WhatsApp Business", "حملات واتساب"], ["social_media_manager", "community_manager"])
s("whatsapp_api_setup", G, "email_marketing", "ربط واتساب API والكتالوج", "WhatsApp Business API and catalog setup",
  ["واتساب API", "WhatsApp API", "كتالوج واتساب", "رقم رسمي", "green tick"], ["web_developer"])
s("sms_marketing", G, "email_marketing", "الرسائل النصية الدعائية", "SMS marketing",
  ["SMS", "رسائل نصية", "مسجات", "رسائل SMS", "bulk SMS"], ["media_buyer"])
s("push_notifications", G, "email_marketing", "الإشعارات الفورية للتطبيقات والمواقع", "Push notification campaigns",
  ["اشعارات", "push", "نوتيفيكيشن", "in-app"], ["content_writer_ar", "web_developer"])
s("marketing_automation_crm", G, "email_marketing", "أتمتة التسويق وأنظمة CRM", "Marketing automation and CRM setup",
  ["CRM", "هب سبوت", "HubSpot", "زوهو", "Zoho", "أتمتة"], ["web_developer", "strategist"])
s("ai_automation_agents", G, "email_marketing", "الأتمتة ووكلاء الذكاء الاصطناعي", "AI agents and workflow automation",
  ["AI agent", "وكيل ذكي", "n8n", "Make", "Zapier", "أتمتة ذكية"], ["web_developer"])
s("analytics", G, "", "التحليلات والتقارير", "Analytics and reporting",
  ["تحليلات", "تقارير", "analytics", "KPIs", "قياس الأداء"], ["data_analyst"])
s("ga4_gtm_setup", G, "analytics", "إعداد Google Analytics 4 وTag Manager", "GA4 and Google Tag Manager setup",
  ["GA4", "جوجل أناليتكس", "GTM", "تاق مانجر", "Google Analytics"], ["data_analyst", "web_developer"])
s("marketing_dashboards", G, "analytics", "لوحات التقارير التسويقية", "Marketing dashboards (Looker Studio, Power BI)",
  ["داشبورد", "لوحة تحكم", "Looker Studio", "Power BI", "dashboard"], ["data_analyst"])
s("cro", G, "analytics", "تحسين معدل التحويل", "Conversion rate optimization (CRO)",
  ["CRO", "معدل التحويل", "conversion", "تحسين المبيعات", "هيت ماب"], ["ui_ux_designer", "data_analyst"])
s("web_design", G, "", "تصميم المواقع الإلكترونية", "Website design",
  ["موقع", "ويب سايت", "تصميم موقع", "website", "موقع شركة"], ["web_developer", "ui_ux_designer"])
s("landing_pages", G, "web_design", "صفحات الهبوط", "Landing pages",
  ["لاندنق بيج", "لاندنج", "صفحة هبوط", "landing page", "صفحة مبيعات"], ["web_developer", "ui_ux_designer"])
s("web_maintenance", G, "", "صيانة المواقع والدعم الفني", "Website maintenance and support",
  ["صيانة موقع", "تحديث موقع", "دعم فني", "maintenance", "support"], ["web_developer"])
s("hosting_domains", G, "web_maintenance", "الاستضافة والدومين والبريد الرسمي", "Hosting, domains and business email",
  ["استضافة", "دومين", "نطاق", "hosting", "ايميل رسمي", "Google Workspace"], ["web_developer"])
s("website_security", G, "web_maintenance", "حماية المواقع والنسخ الاحتياطي", "Website security and backups",
  ["حماية", "SSL", "اختراق", "backup", "security"], ["web_developer"])
s("ecommerce_setup", G, "", "إنشاء المتاجر الإلكترونية", "Online store setup",
  ["متجر", "متجر إلكتروني", "متجر الكتروني", "online store", "ecommerce", "ExpandCart"], ["web_developer"])
s("salla_store_setup", G, "ecommerce_setup", "إنشاء وتصميم متجر سلة", "Salla store setup",
  ["سلة", "Salla", "متجر سلة", "ثيم سلة"], ["web_developer", "graphic_designer"])
s("zid_store_setup", G, "ecommerce_setup", "إنشاء وتصميم متجر زد", "Zid store setup",
  ["زد", "Zid", "متجر زد"], ["web_developer", "graphic_designer"])
s("shopify_store_setup", G, "ecommerce_setup", "إنشاء متجر شوبيفاي", "Shopify store setup",
  ["شوبيفاي", "Shopify", "متجر شوبيفاي", "ثيم شوبيفاي"], ["web_developer"])
s("woocommerce_setup", G, "ecommerce_setup", "إنشاء متجر ووكومرس", "WooCommerce store setup",
  ["ووكومرس", "WooCommerce", "ووردبريس متجر"], ["web_developer"])
s("store_management", G, "ecommerce_setup", "إدارة المتجر الإلكتروني الشهرية", "Monthly e-commerce store management",
  ["إدارة متجر", "store management", "العروض والكوبونات", "تشغيل متجر"], ["social_media_manager", "web_developer"])
s("product_upload", G, "ecommerce_setup", "رفع وإدخال المنتجات", "Product upload and catalog entry",
  ["رفع منتجات", "إدخال منتجات", "كتالوج", "catalog", "data entry"], ["content_writer_ar"])
s("payment_shipping_integration", G, "ecommerce_setup", "ربط بوابات الدفع والشحن", "Payment gateway and shipping integration",
  ["بوابة دفع", "مدى", "تابي", "تمارا", "شحن", "Apple Pay"], ["web_developer"])
s("marketplace_management", G, "ecommerce_setup", "إدارة المتاجر على أمازون ونون", "Amazon and Noon marketplace management",
  ["أمازون", "نون", "Amazon", "Noon", "marketplace", "بائع أمازون"], ["media_buyer", "content_writer_ar"])
s("delivery_app_listing", G, "ecommerce_setup", "إدارة المطاعم على تطبيقات التوصيل", "Delivery app listing and optimization",
  ["طلبات", "هنقرستيشن", "جاهز", "كيتا", "مرسول", "Talabat"], ["social_media_manager", "photographer"])
s("product_feeds_catalogs", G, "ads_google", "كتالوجات المنتجات وربط Merchant Center", "Product feeds and catalogs (Meta, Google Merchant)",
  ["كتالوج ميتا", "Meta catalog", "product feed", "فيد منتجات", "DPA"], ["media_buyer", "web_developer"])

# ───────────── web_dev ─────────────
G = "web_dev"
s("custom_web_development", G, "web_design", "برمجة المواقع المخصصة", "Custom website and web app development",
  ["برمجة موقع", "مبرمج", "Laravel", "React", "Next.js", "full stack"], ["web_developer"])
s("wordpress_development", G, "web_design", "مواقع ووردبريس", "WordPress website development",
  ["ووردبريس", "وردبريس", "WordPress", "Elementor", "المنتور"], ["web_developer"])
s("nocode_websites", G, "web_design", "مواقع بدون برمجة (ويبفلو، ويكس، فريمر)", "No-code websites (Webflow, Wix, Framer)",
  ["ويبفلو", "ويكس", "Webflow", "Wix", "Framer", "no-code"], ["web_developer", "ui_ux_designer"])
s("ui_ux_design", G, "web_design", "تصميم واجهات وتجربة المستخدم", "UI/UX design",
  ["UI/UX", "واجهات", "فيجما", "Figma", "UX", "تجربة المستخدم"], ["ui_ux_designer"])
s("mobile_app_development", G, "web_design", "تطوير تطبيقات الجوال", "Mobile app development",
  ["تطبيق", "ابلكيشن", "برمجة تطبيق", "iOS", "Android", "Flutter"], ["web_developer", "ui_ux_designer"])
s("arabic_rtl_localization", G, "web_design", "تعريب المواقع ودعم الاتجاه من اليمين", "Arabic website localization and RTL",
  ["RTL", "تعريب موقع", "موقع عربي انجليزي", "ثنائي اللغة", "bilingual"], ["web_developer", "content_writer_ar"])
s("booking_systems", G, "web_design", "أنظمة الحجز والمواعيد", "Booking and appointment systems",
  ["نظام حجز", "مواعيد", "booking", "حجوزات"], ["web_developer"])
s("digital_menu_qr", G, "web_design", "المنيو الإلكتروني وQR", "Digital QR menus",
  ["منيو QR", "منيو إلكتروني", "QR", "باركود", "digital menu"], ["web_developer", "graphic_designer"])
s("ar_vr_experiences", G, "web_design", "تجارب الواقع المعزز والافتراضي", "AR/VR and immersive experiences",
  ["واقع معزز", "واقع افتراضي", "AR", "VR", "WebAR", "ميتافيرس"], ["3d_artist", "web_developer"])
s("branded_games", G, "web_design", "الألعاب التسويقية والتلعيب", "Branded games and gamification",
  ["لعبة", "عجلة الحظ", "gamification", "تلعيب", "كويز"], ["web_developer", "graphic_designer"])

# ───────────── strategy ─────────────
G = "strategy"
s("marketing_strategy", G, "brand_strategy", "الاستراتيجية والخطة التسويقية", "Marketing strategy and plan",
  ["خطة تسويق", "خطة تسويقية", "استراتيجية تسويق", "marketing plan", "marketing strategy"], ["strategist"])
s("digital_marketing_strategy", G, "smm_strategy", "استراتيجية التسويق الرقمي", "Digital marketing strategy",
  ["استراتيجية رقمية", "digital strategy", "خطة ديجيتال", "ديجيتال"], ["strategist"])
s("content_strategy", G, "smm_strategy", "استراتيجية المحتوى", "Content strategy",
  ["استراتيجية محتوى", "content strategy", "محاور المحتوى", "content pillars"], ["strategist", "content_writer_ar"])
s("market_research", G, "brand_strategy", "أبحاث ودراسات السوق", "Market research",
  ["دراسة سوق", "بحث سوق", "market study", "market research", "دراسة السوق"], ["strategist", "data_analyst"])
s("competitor_analysis", G, "brand_strategy", "تحليل المنافسين", "Competitor analysis",
  ["منافسين", "تحليل منافسين", "competitor analysis", "benchmark"], ["strategist", "data_analyst"])
s("surveys_focus_groups", G, "brand_strategy", "الاستبيانات ومجموعات التركيز", "Consumer surveys and focus groups",
  ["استبيان", "فوكس جروب", "survey", "focus group", "رأي العملاء"], ["strategist", "data_analyst"])
s("personas_customer_journey", G, "brand_strategy", "شخصية العميل ورحلته", "Buyer personas and customer journey",
  ["بيرسونا", "persona", "رحلة العميل", "customer journey", "الجمهور المستهدف"], ["strategist"])
s("go_to_market", G, "brand_strategy", "خطة إطلاق المنتجات والعلامات", "Product launch and go-to-market",
  ["إطلاق", "لونش", "launch", "go-to-market", "خطة إطلاق"], ["strategist"])
s("campaign_concept", G, "smm_strategy", "الفكرة الإبداعية للحملات", "Creative campaign concept (big idea)",
  ["فكرة حملة", "كونسبت", "كريتف", "concept", "big idea"], ["strategist", "content_writer_ar"])
s("integrated_campaigns", G, "smm_strategy", "الحملات التسويقية المتكاملة (360)", "Integrated 360 campaigns",
  ["360", "حملة متكاملة", "IMC", "حملة تسويقية", "campaign"], ["strategist", "media_buyer"])
s("seasonal_campaigns", G, "smm_strategy", "حملات المواسم (رمضان، العيد، اليوم الوطني)", "Seasonal campaigns (Ramadan, Eid, National Day, White Friday)",
  ["رمضان", "العيد", "اليوم الوطني", "الجمعة البيضاء", "يوم التأسيس", "مواسم"], ["strategist", "social_media_manager"])
s("marketing_consulting", G, "brand_strategy", "الاستشارات التسويقية", "Marketing consulting",
  ["استشارة", "استشارة تسويقية", "consulting", "كونسلتنق"], ["strategist"])
s("fractional_cmo", G, "brand_strategy", "مدير تسويق خارجي بدوام جزئي", "Fractional CMO / outsourced marketing team",
  ["CMO", "مدير تسويق", "قسم تسويق خارجي", "outsourced marketing", "fractional"], ["strategist"])
s("marketing_training", G, "smm_strategy", "التدريب وورش العمل التسويقية", "Marketing training and workshops",
  ["دورة", "تدريب", "ورشة", "كورس", "workshop"], ["strategist", "social_media_manager"])
s("loyalty_referral_programs", G, "email_marketing", "برامج الولاء والإحالة", "Loyalty and referral programs",
  ["ولاء", "نقاط", "إحالة", "loyalty", "referral", "كاشباك"], ["strategist", "web_developer"])
s("affiliate_marketing", G, "smm_influencer", "التسويق بالعمولة", "Affiliate marketing",
  ["أفلييت", "عمولة", "كود خصم", "affiliate", "كوبونات"], ["influencer_manager", "media_buyer"])

# ───────────── pr_comms ─────────────
G = "pr_comms"
s("public_relations", G, "brand_strategy", "العلاقات العامة", "Public relations",
  ["علاقات عامة", "PR", "بي آر", "public relations"], ["pr_specialist"])
s("press_releases", G, "brand_strategy", "كتابة وتوزيع البيانات الصحفية", "Press release writing and distribution",
  ["بيان صحفي", "خبر صحفي", "press release", "نشر خبر"], ["pr_specialist", "content_writer_ar"])
s("media_relations", G, "brand_strategy", "العلاقات الإعلامية والتغطية الصحفية", "Media relations and press coverage",
  ["تغطية إعلامية", "صحافة", "إعلام", "media coverage", "مقابلات صحفية"], ["pr_specialist"])
s("crisis_communication", G, "brand_strategy", "إدارة الأزمات الإعلامية", "Crisis communication",
  ["أزمة", "إدارة أزمات", "crisis", "أزمة سمعة"], ["pr_specialist", "strategist"])
s("reputation_management", G, "smm_community", "إدارة السمعة والتقييمات", "Online reputation and review management",
  ["سمعة", "تقييمات", "ريفيوز", "ORM", "reviews"], ["pr_specialist", "community_manager"])
s("press_conferences", G, "activations", "تنظيم المؤتمرات الصحفية", "Press conferences and media events",
  ["مؤتمر صحفي", "press conference", "لقاء إعلامي", "حدث إعلامي"], ["pr_specialist", "event_manager"])
s("media_training", G, "brand_strategy", "التدريب الإعلامي للمتحدثين", "Media and spokesperson training",
  ["تدريب إعلامي", "متحدث رسمي", "media training", "spokesperson"], ["pr_specialist"])
s("corporate_communications", G, "brand_strategy", "الاتصال المؤسسي والداخلي", "Corporate and internal communications",
  ["اتصال مؤسسي", "اتصال داخلي", "internal comms", "نشرة داخلية"], ["pr_specialist", "content_writer_ar"])
s("csr_campaigns", G, "brand_strategy", "حملات المسؤولية الاجتماعية", "CSR and social impact campaigns",
  ["مسؤولية اجتماعية", "CSR", "حملة توعوية", "تطوعي", "استدامة"], ["pr_specialist", "strategist"])

# ───────────── offline ─────────────
G = "offline"
s("event_coverage", G, "", "تغطية الفعاليات (تصوير وفيديو)", "Event coverage (photo and video)",
  ["تغطية", "تغطية فعالية", "event coverage", "فعاليات", "مناسبات"], ["photographer", "videographer"])
s("event_photography", G, "event_coverage", "تصوير الفعاليات والمؤتمرات", "Event and conference photography",
  ["تصوير فعاليات", "مؤتمرات", "تخرج", "event photography"], ["photographer"])
s("event_highlight_video", G, "event_coverage", "فيديو ملخص الفعالية", "Event highlight and aftermovie video",
  ["هايلايت", "افتر موفي", "aftermovie", "recap", "ملخص فعالية"], ["videographer", "video_editor"])
s("event_live_streaming", G, "event_coverage", "البث المباشر للفعاليات", "Event live streaming",
  ["نقل مباشر", "لايف ستريم", "بث مباشر", "streaming", "multi-camera"], ["videographer"])
s("activations", G, "", "التفعيلات التسويقية", "Brand activations",
  ["اكتفيشن", "تفعيل", "activation", "تسويق تجريبي", "experiential"], ["event_manager"])
s("event_management", G, "activations", "تنظيم وإدارة الفعاليات", "Event planning and management",
  ["تنظيم فعاليات", "ايفنت", "event management", "حفلات", "مؤتمرات"], ["event_manager"])
s("launch_openings", G, "activations", "حفلات الإطلاق والافتتاح", "Launch events and grand openings",
  ["افتتاح", "حفل إطلاق", "grand opening", "launch event", "قص الشريط"], ["event_manager", "pr_specialist"])
s("sampling_promoters", G, "activations", "توزيع العينات والمروجين", "Sampling, promoters and hostesses",
  ["بروموتر", "مروجين", "عينات", "sampling", "هوستس", "مضيفات"], ["event_manager", "model_talent"])
s("exhibition_booth_design", G, "activations", "تصميم وتنفيذ أجنحة المعارض", "Exhibition booth design and build",
  ["بوث", "ستاند", "جناح معرض", "booth", "exhibition", "معارض"], ["3d_artist", "printing_production"])
s("stage_event_decor", G, "activations", "تجهيز المسارح وديكور الفعاليات", "Stage design and event decor",
  ["مسرح", "ديكور", "كوشة", "stage", "تنسيق حفلات"], ["event_manager", "3d_artist"])
s("av_led_rental", G, "activations", "تأجير الصوتيات والشاشات للفعاليات", "AV, sound and LED screen rental",
  ["شاشات LED", "صوتيات", "إضاءة مسرح", "AV", "LED"], ["event_manager"])
s("photo_booth", G, "activations", "فوتو بوث والطباعة الفورية", "Photo booth and instant printing",
  ["فوتو بوث", "photo booth", "360 booth", "طباعة فورية", "بوث 360"], ["photographer", "event_manager"])
s("sponsorship_management", G, "activations", "إدارة الرعايات", "Sponsorship management",
  ["رعاية", "رعايات", "sponsorship", "راعي"], ["event_manager", "pr_specialist"])
s("print_design", G, "", "التصميم الطباعي والمطبوعات", "Print design",
  ["مطبوعات", "تصميم طباعي", "print", "طباعة"], ["graphic_designer"])
s("flyers_brochures", G, "print_design", "تصميم البروشورات والفلايرات", "Flyer and brochure design",
  ["فلاير", "بروشور", "مطوية", "flyer", "brochure", "بوستر"], ["graphic_designer"])
s("printing_services", G, "print_design", "الطباعة وتنفيذ المطبوعات", "Printing and print production",
  ["مطبعة", "طباعة أوفست", "طباعة ديجيتال", "printing", "offset"], ["printing_production"])
s("rollups_banners", G, "print_design", "الرول أب والبنرات والطباعة الكبيرة", "Roll-ups, banners and large-format printing",
  ["رول اب", "بنر", "roll-up", "فلكس", "large format"], ["printing_production", "graphic_designer"])
s("posm_displays", G, "print_design", "مواد نقاط البيع والستاندات", "POS/POSM displays",
  ["POSM", "ستاند عرض", "ديسبلاي", "نقاط البيع", "wobbler"], ["printing_production", "graphic_designer"])
s("promotional_merchandise", G, "print_design", "الهدايا الدعائية والزي الموحد", "Promotional merchandise and uniforms",
  ["هدايا دعائية", "ميرش", "merch", "يونيفورم", "تيشيرتات", "أكواب"], ["printing_production", "graphic_designer"])
s("outdoor_ads", G, "", "الإعلانات الخارجية واللوحات", "Outdoor advertising (OOH)",
  ["لوحات طرق", "بيلبورد", "OOH", "billboard", "ميجاكوم", "يوني بول"], ["media_buyer"])
s("dooh_screens", G, "outdoor_ads", "الشاشات الرقمية الخارجية", "Digital out-of-home (DOOH)",
  ["شاشات", "شاشات رقمية", "DOOH", "شاشات مولات"], ["media_buyer"])
s("signage", G, "outdoor_ads", "اللوحات الإعلانية للمحلات", "Shop signage and 3D letters",
  ["لوحات", "يافطة", "آرمة", "حروف بارزة", "نيون", "signage"], ["printing_production", "graphic_designer"])
s("vehicle_branding", G, "outdoor_ads", "تغليف السيارات الدعائي", "Vehicle wraps and fleet branding",
  ["تغليف سيارات", "ستيكر سيارات", "wrap", "fleet", "سيارات الشركة"], ["printing_production", "graphic_designer"])
s("tv_radio_ads", G, "outdoor_ads", "الإعلانات في التلفزيون والإذاعة والسينما", "TV, radio and cinema advertising",
  ["تلفزيون", "راديو", "إذاعة", "سينما", "TV", "radio"], ["media_buyer"])
s("print_media_ads", G, "outdoor_ads", "إعلانات الصحف والمجلات", "Newspaper and magazine ads",
  ["جريدة", "صحف", "مجلات", "print ads", "إعلان مطبوع"], ["media_buyer", "graphic_designer"])

# ───────────── validation ─────────────
errs = []
gkeys = {g[0] for g in GROUPS}
rkeys = {r[0] for r in ROLES}
keys = [x["key"] for x in S]
dup = [k for k, c in Counter(keys).items() if c > 1]
if dup: errs.append(f"duplicate keys {dup}")
for k in CORE:
    if k not in keys: errs.append(f"missing core {k}")
kre = re.compile(r"^[a-z0-9]+(_[a-z0-9]+)*$")
for x in S:
    k = x["key"]
    if not kre.match(k) or len(k) > 40: errs.append(f"bad key {k}")
    if x["group"] not in gkeys: errs.append(f"bad group {k}")
    if x["parent"] not in CORE: errs.append(f"bad parent {k}->{x['parent']}")
    if k in CORE and (x["parent"] != k or x["group"] != CORE_GROUP[k]): errs.append(f"core mismatch {k}")
    if not x["roles"] or any(r not in rkeys for r in x["roles"]): errs.append(f"bad roles {k}")
    if len(x["aliases"]) > 6: errs.append(f"too many aliases {k}")
    if len(set(a.lower() for a in x["aliases"])) != len(x["aliases"]): errs.append(f"dup alias in {k}")
for f in ("name_ar", "name_en"):
    names = Counter(x[f] for x in S)
    d = [n for n, c in names.items() if c > 1]
    if d: errs.append(f"dup {f}: {d}")
if errs:
    print("\n".join(errs)); sys.exit(1)

out = {
    "version": 1,
    "groups": [dict(key=k, name_ar=a, name_en=e) for k, a, e in GROUPS],
    "roles": [dict(key=k, name_ar=a, name_en=e) for k, a, e in ROLES],
    "services": [dict(key=x["key"], group=x["group"], parent=x["parent"], name_ar=x["name_ar"],
                      name_en=x["name_en"], aliases=x["aliases"], roles=x["roles"]) for x in S],
}
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
print("ok", len(S))
