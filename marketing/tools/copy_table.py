#!/usr/bin/env python3
"""Builds marketing/copy/ad-copy.md from the copy below and checks every line against platform limits."""
import os
LIMITS = {  # characters (Arabic letters count 1; diacritics count too, so we avoid them in ads)
 'meta_primary': (125, 'Meta primary text: visible before "more"'), 'meta_headline': (40, 'Meta headline'), 'meta_desc': (30, 'Meta description'),
 'tiktok_text': (100, 'TikTok ad text'), 'snap_headline': (34, 'Snap headline'), 'x_post': (280, 'X post'), 'x_card': (70, 'X card headline'),
 'li_intro': (150, 'LinkedIn intro (visible)'), 'li_headline': (70, 'LinkedIn headline'),
 'g_head': (30, 'Google RSA headline'), 'g_desc': (90, 'Google RSA description'), 'yt_head': (15, 'YouTube headline'), 'yt_long': (90, 'YouTube long headline'),
 'wa': (700, 'WhatsApp status/channel'),
}
C = {}
def add(asset, field, ar, en): C.setdefault(asset, []).append((field, ar, en))
# --- Hero / find in a minute (V01, V02, V03, V05, M1) ---
for a in ('SWQ-V01 / V02 / V13 hero', 'SWQ-V03 15s · V05 6s · M1 statics'):
    pass
A = 'Hero & "find in a minute" (V01, V02, V03, V05, V13, M1)'
add(A,'meta_primary','بدّك وكالة تسويق؟ شوف شغلهم الحقيقي وأسعارهم، واسأل المطابق الذكي يرشّحلك الأنسب بدقيقة.','Need a marketing agency? See real work and prices, and let the AI matchmaker suggest the best fit in a minute.')
add(A,'meta_headline','وكالتك المناسبة بدقيقة','The right agency in a minute')
add(A,'meta_desc','مجاناً للأعمال','Free for businesses')
add(A,'tiktok_text','مش عارف أي وكالة تسويق تختار؟ جاوب على ٤ أسئلة وشوف الترشيحات 👀','Not sure which agency to pick? Answer 4 questions and see your matches 👀')
add(A,'snap_headline','وكالتك المناسبة بدقيقة','Your agency, in a minute')
add(A,'x_post','بدّك وكالة تسويق لمشروعك؟ على سوّق بتشوف أعمال حقيقية وأسعار الباقات، وبتسأل المطابق الذكي عن الأنسب لك. sawwiq.org/match','Need a marketing agency? On Sawwiq you see real work and package prices, then ask the AI matchmaker for the best fit. sawwiq.org/match')
add(A,'x_card','سوّق: فريقك التسويقي يبدأ من هنا','Sawwiq: your marketing team starts here')
add(A,'yt_head','وكالتك بدقيقة','Agency in 1 min')
add(A,'yt_long','شوف شغل وكالات التسويق الحقيقي، واختار الأنسب لك بدقيقة','See real agency work and pick the right one in a minute')
A = 'See real work (V04, M2)'
add(A,'meta_primary','لا تختار وكالة من البروفايل. على سوّق شوف منشوراتها الحقيقية لعملاء بمجالك، مع الباقات والأسعار.','Don\'t pick an agency from its bio. On Sawwiq, see real posts for clients in your field, with packages and prices.')
add(A,'meta_headline','شوف الشغل قبل ما تدفع','See the work before you pay')
add(A,'meta_desc','أعمال حقيقية · أسعار واضحة','Real work · clear prices')
add(A,'tiktok_text','شوف شغل الوكالة الحقيقي قبل ما تدفع ولا دينار ✅','See an agency\'s real work before you pay a thing ✅')
add(A,'snap_headline','شف الشغل قبل لا تدفع','See the work before paying')
A = 'Milestone contracts, launch-safe (M3b, hero segment)'
add(A,'meta_primary','عقد واضح مع الوكالة، مقسّم لمراحل وتسليمات، وكل مرحلة تعتمدها بنفسك. بدون رسوم مفاجئة.','A clear contract with the agency, split into milestones and deliverables. You approve each one. No surprise charges.')
add(A,'meta_headline','عقد واضح، على مراحل','A clear contract, in milestones')
A = 'Protected payments: HOLD until licensed PSP (V09, V12, M3)'
add(A,'meta_primary','ادفع على مراحل: كل دفعة محفوظة لدى طرف ثالث موثوق، وما بتوصل للوكالة إلا لما توافق على الشغل.','Pay per milestone: each payment is held by a trusted third party and only reaches the agency when you approve the work.')
add(A,'meta_headline','ادفع وإنت مطمّن','Pay with peace of mind')
A = 'Agencies (V07, V08, M5, C2)'
add(A,'meta_primary','وكالتك تستاهل واجهة تليق بشغلها. اعمل صفحة مجانية على سوّق واستقبل طلبات عملاء حقيقيين.','Your agency deserves a proper showcase. Create a free Sawwiq page and receive real client requests.')
add(A,'meta_headline','صفحة مجانية لوكالتك','A free page for your agency')
add(A,'meta_desc','مجاناً خلال الإطلاق','Free during launch')
add(A,'li_intro','صفحة مجانية لوكالتك على سوّق: شغلك مجمّع حسب العميل، وطلبات من عملاء جادّين في ٨ دول.','A free Sawwiq page for your agency: work grouped by client, and requests from serious clients in 8 countries.')
add(A,'li_headline','فريقك التسويقي يبدأ من هنا: سجّل وكالتك مجاناً','Your marketing team starts here: list your agency free')
add(A,'tiktok_text','عندك وكالة أو شغل حر؟ اعمل صفحتك مجاناً واستقبل طلبات عملاء 🎨','Agency or freelancer? Create your free page and get client requests 🎨')
add(A,'snap_headline','صفحة مجانية لوكالتك','A free page for your agency')
A = 'Saudi (V10, M1-SA, M5-SA)'
add(A,'meta_primary','تبي وكالة تسويق لمشروعك؟ في سوّق شف شغلهم الحقيقي وأسعارهم بالريال، والمطابق الذكي يرشّح لك الأنسب.','Want a marketing agency? On Sawwiq see real work and prices in riyals; the AI matchmaker suggests the best fit.')
add(A,'meta_headline','شف شغلهم قبل لا تدفع','See their work first')
add(A,'snap_headline','تبي وكالة تسويق؟','Need a marketing agency?')
add(A,'tiktok_text','تبي وكالة تسويق في الرياض؟ شف شغلهم قبل لا تدفع 👀','Need an agency in Riyadh? See their work before you pay 👀')
A = 'Jordan (V11, M1-JO)'
add(A,'meta_primary','بعمّان في وكالات كتير… على سوّق شوف شغلهم، قارن الأسعار، وتواصل معهم عبر واتساب.','Lots of agencies in Amman… On Sawwiq see their work, compare prices and message them on WhatsApp.')
add(A,'meta_headline','لاقي وكالتك الصح بعمّان','Find your agency in Amman')
A = 'Google Search RSA (Jordan; KSA variants in brackets)'
for h in [('شركات تسويق في عمّان','Marketing agencies in Amman'),('وكالات سوشيال ميديا موثّقة','Verified social media agencies'),('شوف أعمالهم الحقيقية','See their real work'),('قارن الباقات والأسعار','Compare packages and prices'),('المطابق الذكي بدقيقة','AI matchmaker in a minute'),('عقود واضحة على مراحل','Clear milestone contracts'),('مجاناً للأعمال','Free for businesses'),('شبكة الوكالات العربية','Find your marketing team'),('[شركات تسويق في الرياض]','[Marketing agencies in Riyadh]')]:
    add(A,'g_head',*h)
add(A,'g_desc','شوف أعمال وكالات التسويق الحقيقية وأسعار باقاتها، وتواصل معهم مباشرة عبر واتساب.','See real agency work and package prices, then contact them directly on WhatsApp.')
add(A,'g_desc','جاوب على ٤ أسئلة، والمطابق الذكي يرشّح لك الوكالات الأنسب لمشروعك ومدينتك.','Answer 4 questions; the AI matchmaker suggests the best agencies for your business.')
add(A,'g_desc','عقود على مراحل وتسليمات واضحة. الحسابات والملفات ملكك دائماً.','Milestone contracts with clear deliverables. Your accounts and files always stay yours.')
A = 'WhatsApp status / channel'
add(A,'wa','بدّك وكالة تسويق لمصلحتك؟ 👀 جرّب المطابق الذكي على سوّق: ٤ أسئلة وبس، وبيرشّحلك وكالات بمدينتك مع أعمالهم وأسعارهم. sawwiq.org/match','Need a marketing agency? 👀 Try the Sawwiq AI matchmaker: 4 questions and it suggests agencies in your city, with their work and prices. sawwiq.org/match')
add(A,'wa','عندك وكالة أو شغل حر؟ 🎨 اعمل صفحة مجانية على سوّق واستقبل طلبات عملاء حقيقيين. sawwiq.org/join','Run an agency or freelance? 🎨 Create a free Sawwiq page and receive real client requests. sawwiq.org/join')

out = ['# Ad copy: every asset, every platform (AR first, EN second)', '',
 'Generated by `marketing/tools/copy_table.py`, which counts characters and flags anything over the platform limit. CTAs use each platform\'s built-in buttons: Meta «اعرف المزيد / سجّل الآن» ("Learn more / Sign up"); TikTok «اعرف المزيد» ("Learn more"); Snap «زيارة» ("Visit"); LinkedIn «سجّل» ("Register"); Google (none).', '',
 'UTM pattern: `?utm_source={platform}&utm_medium=paid|organic&utm_campaign=launch-{country}-{audience}&utm_content={assetID}`', '']
bad = 0
for asset, rows in C.items():
    out += [f'## {asset}', '', '| Field (limit) | Arabic | chars | English | chars |', '|---|---|---|---|---|']
    for f, ar, en in rows:
        lim, label = LIMITS[f]; la, le = len(ar), len(en)
        fa = f'{la}' + (' ⚠️' if la > lim else ' ✓'); fe = f'{le}' + (' ⚠️' if le > lim else ' ✓')
        bad += (la > lim) + (le > lim)
        out.append(f'| {label} ({lim}) | {ar} | {fa} | {en} | {fe} |')
    out.append('')
out += ['## 7. Community replies (DM and comments)', '',
 '| Situation | Arabic | English |', '|---|---|---|',
 '| "How much does it cost?" (business) | «التصفّح والمطابق الذكي وطلب العروض مجاناً للأعمال. الأسعار بتحددها كل وكالة وبتشوفها بصفحتها.» | "Browsing, the matchmaker and requesting quotes are free for businesses. Each agency sets its own prices, shown on its page." |', 
 '| "Is payment protected?" | «الدفع على مراحل موجود بالعقود. الدفع المحمي عبر طرف ثالث بيتفعّل مع مزوّد دفع مرخّص، وبنعلن عنه أول ما يصير جاهز.» | "Milestone contracts are live. Protected payment through a third party goes live with a licensed payment provider; we\'ll announce it when ready." |',
 '| "Do agencies pay?" | «لا، مجاناً خلال فترة الإطلاق.» | "No, it\'s free during the launch period." |',
 '| Complaint about an agency | «آسفين على التجربة. ابعتلنا التفاصيل على الخاص وفريقنا بيتابع خلال يوم عمل.» | "Sorry about that. DM us the details and our team will follow up within one working day." |', '']
out.append(f'**Limit check:** {"all lines within limits ✓" if bad == 0 else str(bad) + " lines over limit ⚠️"}')
os.makedirs('/home/user/sm-mena/marketing/copy', exist_ok=True)
open('/home/user/sm-mena/marketing/copy/ad-copy.md', 'w').write('\n'.join(out) + '\n')
print('over-limit lines:', bad)
