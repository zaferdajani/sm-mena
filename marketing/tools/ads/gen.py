import json, urllib.parse, os, subprocess, sys
OUT = '/home/user/sm-mena/marketing/assets/stills'
M = {
 'M1-find': dict(photo='K01', ar=dict(chip='المطابق الذكي', t='اعرف وكالتك المناسبة <em>بدقيقة</em>', s='جاوب على ٤ أسئلة: الخدمة، المنصّات، الميزانية والمدينة، والمطابق الذكي يرشّح لك الأنسب.', cta='اسأل المطابق الذكي'),
                en=dict(chip='AI matchmaker', t='Find the right agency <em>in a minute</em>', s='Answer 4 questions: service, platforms, budget and city. The AI matchmaker suggests the best fit.', cta='Ask the matchmaker')),
 'M2-real-work': dict(photo='K03', ar=dict(chip='أعمال حقيقية', t='شوف <em>الشغل الحقيقي</em> قبل ما تدفع', s='أعمال وكالات في بلدك، مع الباقات والأسعار والتقييمات.', cta='تصفّح الوكالات'),
                en=dict(chip='Real work', t='See <em>real work</em> before you pay', s='Real work from agencies in your country, with packages, prices and reviews.', cta='Browse agencies')),
 'M3-milestones-HOLD': dict(photo='K04', ar=dict(chip='الدفع المحمي', t='ادفع <em>على مراحل</em>، والمبلغ ينتظر موافقتك', s='كل مرحلة تُحفظ لدى طرف ثالث موثوق، وتنتقل للوكالة بعد ما تعتمد التسليمات.', cta='ابدأ بأمان', note='يُفعَّل الدفع المحمي مع مزوّد دفع مرخّص.'),
                en=dict(chip='Protected payments', t='Pay <em>per milestone</em>. The money waits for your approval', s='Each milestone is held by a trusted third party and released to the agency when you approve the work.', cta='Start safely', note='Protected payments go live with a licensed payment provider.')),
 'M3b-milestone-contract': dict(photo='K05', ar=dict(chip='عقود واضحة', t='عقد واضح، <em>على مراحل</em>', s='تسليمات محددة لكل مرحلة، وتعتمد كل مرحلة بنفسك. بدون رسوم مفاجئة.', cta='اسأل المطابق الذكي'),
                en=dict(chip='Clear contracts', t='A clear contract, <em>in milestones</em>', s='Set deliverables for every milestone, and you approve each one. No surprise charges.', cta='Ask the matchmaker')),
 'M4-first-arabic': dict(photo='logo', ar=dict(chip='سوّق', t='فريقك التسويقي <em>يبدأ من هنا</em>', s='الأردن · السعودية · الإمارات · الكويت · قطر · البحرين · عُمان · مصر', cta='ابدأ الآن'),
                en=dict(chip='Sawwiq', t='Your marketing team <em>starts here</em>', s='Jordan · Saudi Arabia · UAE · Kuwait · Qatar · Bahrain · Oman · Egypt', cta='Get started')),
 'M5-agencies': dict(photo='K06', ar=dict(chip='للوكالات والمستقلين', t='صفحة <em>مجانية</em> لوكالتك، وطلبات عملاء حقيقية', s='اعرض شغلك مجمّعاً حسب العميل، واستقبل الطلبات وقدّم عروضك. مجاناً خلال الإطلاق.', cta='أنشئ صفحتك مجاناً'),
                en=dict(chip='For agencies & freelancers', t='A <em>free</em> showcase, and real client requests', s='Show your work grouped by client, receive requests and send proposals. Free during launch.', cta='Create your free page')),
 'M1-SA-find': dict(photo='K07', ar=dict(chip='السعودية', t='تبي وكالة تسويق؟ <em>شف شغلها قبل لا تدفع</em>', s='وكالات في الرياض وجدة والدمام، بأعمال حقيقية وأسعار واضحة بالريال.', cta='اسأل المطابق الذكي')),
 'M5-SA-agencies': dict(photo='K08', ar=dict(chip='وكالات السعودية', t='وكالتك في الرياض؟ <em>اعرض شغلك مجاناً</em>', s='واستقبل طلبات عملاء من السعودية والخليج.', cta='أنشئ صفحتك مجاناً')),
 'M1-JO-find': dict(photo='K09', pos='center 30%', ar=dict(chip='الأردن', t='بعمّان؟ <em>لاقي وكالتك الصح</em>', s='شوف شغلهم الحقيقي، قارن الأسعار، وتواصل عبر واتساب.', cta='تصفّح الوكالات')),
}
SIZES = {'1x1': (1080, 1080), '4x5': (1080, 1350), '9x16': (1080, 1920)}
jobs = []
def job(sub, name, w, h, q):
    d = os.path.join(OUT, sub); os.makedirs(d, exist_ok=True)
    jobs.append({'html': 'ad.html', 'out': os.path.join(d, name + '.jpg'), 'w': w, 'h': h, 'q': '?' + urllib.parse.urlencode(q)})
for k, m in M.items():
    for lang in ('ar', 'en'):
        if lang not in m: continue
        for sz, (w, h) in SIZES.items():
            q = dict(m[lang], lang=lang, photo=m['photo']);
            if 'pos' in m: q['pos'] = m['pos']
            job('key-messages', f'SWQ-{k}-{lang}-{sz}', w, h, q)
# carousels 1080x1350
C1 = [dict(photo='K02', chip='دليل سوّق', t='كيف تختار <em>وكالة التسويق</em> الصح؟', s='٥ أسئلة قبل ما توقّع أي عقد. اسحب ←'),
      dict(num='1', t='شوف <em>شغلهم الحقيقي</em>', s='مش البروفايل ولا الوعود… منشورات ونتائج لعملاء بنفس مجالك.'),
      dict(num='2', t='اسأل عن <em>الأرقام</em>', s='شو المستهدف؟ رسائل، حجوزات، مبيعات… واطلب تقرير شهري ثابت.'),
      dict(num='3', t='الحسابات <em>باسمك</em>', s='صفحاتك وملفاتك ملكك، وبتنسلّم كاملة عند نهاية العقد.'),
      dict(num='4', t='عقد <em>على مراحل</em>', s='كل مرحلة بتسليمات واضحة، وأي تغيير بطلب مكتوب. بدون رسوم مفاجئة.'),
      dict(num='5', t='قارن <em>٣ عروض</em> على الأقل', s='على سوّق: اسأل المطابق الذكي، واستلم عروض، وقارن بهدوء.', cta='اسأل المطابق الذكي')]
C2 = [dict(photo='K06', chip='للوكالات', t='٤ أسباب تفتح صفحة <em>وكالتك</em> على سوّق', s='اسحب ←'),
      dict(num='1', t='<em>مجاناً</em> خلال الإطلاق', s='بدون اشتراك، وبدون رسوم على الطلبات.'),
      dict(num='2', t='شغلك <em>مجمّع حسب العميل</em>', s='اعرض الحملات والحسابات اللي اشتغلت عليها، مثل ما بتحب تنعرض.'),
      dict(num='3', t='طلبات <em>عملاء جادّين</em>', s='ملخّص الطلب يوصلك بدون بيانات العميل، لحد ما تقدّم عرضك.'),
      dict(num='4', t='عقود <em>بتحمي حقّك</em>', s='مراحل وتسليمات واضحة، وطلبات التغيير موثّقة.', cta='أنشئ صفحتك مجاناً')]
for name, slides in (('C1-how-to-choose-an-agency', C1), ('C2-agencies-4-reasons', C2)):
    for i, sl in enumerate(slides, 1):
        q = dict(sl, lang='ar'); q.setdefault('cta', ''); 
        if 'photo' not in q: q['ts'] = '7.4'
        job('carousels', f'SWQ-{name}-{i:02d}', 1080, 1350, q)
# WhatsApp status
WA = [dict(photo='K01', chip='مرحبا 👋', t='بدّك وكالة تسويق؟ 👀', s='جرّب المطابق الذكي على سوّق: ٤ أسئلة وبس.', cta='sawwiq.org/match'),
      dict(photo='K03', chip='نصيحة اليوم', t='شوف الشغل قبل ما تدفع ✅', s='أعمال حقيقية وأسعار واضحة، لوكالات في بلدك.', cta='تصفّح الوكالات'),
      dict(photo='K06', chip='للوكالات 🎨', t='عندك وكالة أو شغل حر؟', s='اعمل صفحة مجانية، واستقبل طلبات عملاء حقيقيين.', cta='أنشئ صفحتك مجاناً'),
      dict(photo='logo', chip='سوّق', t='فريقك التسويقي <em>يبدأ من هنا</em>', s='احفظ الرابط وشاركه مع أي صاحب مصلحة 🙏', cta='sawwiq.org')]
for i, w in enumerate(WA, 1): job('whatsapp-status', f'SWQ-WA-status-{i:02d}', 1080, 1920, dict(w, lang='ar'))
# Google Display (M1 ar + M5 ar)
GD = [(300,250),(336,280),(728,90),(300,600),(320,50),(160,600),(970,250),(1200,628),(1200,1200),(320,100),(468,60)]
for k in ('M1-find', 'M5-agencies'):
    for (w,h) in GD:
        q = dict(M[k]['ar'], lang='ar', photo=M[k]['photo']); q.pop('note', None)
        if w*h < 100000: q.pop('s', None); q.pop('chip', None)
        if h < 130:
            q['t'] = {'M1-find': 'وكالتك المناسبة <em>بدقيقة</em>', 'M5-agencies': 'صفحة <em>مجانية</em> لوكالتك'}[k]
            if w < 500: q.pop('photo', None)
            if w < 400: q['cta'] = 'ابدأ'
            if w < 400 and h >= 100: q['ts'] = '2.1'
        job('google-display', f'SWQ-GDN-{k}-ar-{w}x{h}', w, h, q)
# covers
CV = dict(chip='', t='فريقك التسويقي <em>يبدأ من هنا</em>', s='شوف الشغل الحقيقي، قارن، وادفع على مراحل.', cta='sawwiq.org', lang='ar')
job('covers', 'SWQ-cover-facebook-1640x624', 1640, 624, dict(CV, center='900', ts='2.7', cta=''))
job('covers', 'SWQ-cover-x-1500x500', 1500, 500, dict(CV, photo='K03w', cta='اسأل المطابق الذكي'))
job('covers', 'SWQ-cover-linkedin-company-1128x191', 1128, 191, dict(CV, photo='K06w2', t='صفحة مجانية لوكالتك، وطلبات عملاء حقيقية', cta='sawwiq.org'))
job('covers', 'SWQ-cover-linkedin-personal-1584x396', 1584, 396, dict(CV, photo='K06w2', t='فريقك التسويقي <em>يبدأ من هنا</em>'))
job('covers', 'SWQ-cover-youtube-2560x1440', 2560, 1440, dict(CV, center='1400', ts='5.6', cta=''))
job('covers', 'SWQ-cover-snapchat-tiktok-1080x1920', 1080, 1920, dict(CV, photo='K07', cta='اسأل المطابق الذكي'))
json.dump(jobs, open('jobs.json', 'w'), ensure_ascii=False)
print(len(jobs), 'jobs')
