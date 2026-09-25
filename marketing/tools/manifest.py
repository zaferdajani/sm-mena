#!/usr/bin/env python3
"""Writes marketing/assets/manifest.md from the files on disk plus the table below."""
import os, re, subprocess, glob
M = '/home/user/sm-mena/marketing/assets'
FF = 'ffmpeg'
def probe(f):
    r = subprocess.run([FF, '-i', f], capture_output=True, text=True).stderr
    d = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r); wh = re.search(r', (\d{3,4})x(\d{3,4})', r)
    return (int(d[2])*60+float(d[3]) if d else 0), (f'{wh[1]}×{wh[2]}' if wh else '')
links = {l.split('\t')[0]: l.split('\t')[2] for l in open(f'{M}/video-links.tsv').read().splitlines()}
V = {  # id: (platforms, message, copy section, status)
 'SWQ-V01-hero-ar-9x16': ('IG/FB Reels, TikTok, Snap, YT Shorts, WhatsApp', 'Hero: find → see real work → matcher → milestone contract → verified', 'Hero & "find in a minute"', '✅ Ready (launch-safe)'),
 'SWQ-V02-hero-ar-16x9': ('YouTube, X, LinkedIn, FB feed, website', 'Hero (16:9)', 'Hero & "find in a minute"', '✅ Ready (launch-safe)'),
 'SWQ-V03-find-in-a-minute-ar-15s-9x16': ('Reels, TikTok, Snap, Shorts', 'Find an agency in a minute (15 s cut-down)', 'Hero & "find in a minute"', '✅ Ready. Re-check timing with the live AI provider'),
 'SWQ-V04-bumper-see-real-work-ar-6s-9x16': ('Reels, TikTok, Snap, YouTube bumper (6 s)', 'See real work before you pay', 'See real work', '✅ Ready'),
 'SWQ-V05-bumper-in-a-minute-ar-6s-9x16': ('Reels, TikTok, Snap, YouTube bumper (6 s)', 'Find an agency in a minute', 'Hero & "find in a minute"', '✅ Ready'),
 'SWQ-V06-business-owner-ar-20s-9x16': ('Reels, TikTok, FB', 'Business-owner film (café owner, Amman)', 'Hero & "find in a minute"', '✅ Ready'),
 'SWQ-V07-agency-ar-21s-9x16': ('Reels, TikTok, Snap, WhatsApp', 'Agencies: free showcase + client requests', 'Agencies', '✅ Ready'),
 'SWQ-V08-agency-linkedin-ar-16x9': ('LinkedIn, YouTube, X', 'Agencies (16:9)', 'Agencies', '✅ Ready'),
 'SWQ-V09-payments-explainer-ar-HOLD-9x16': ('Reels, TikTok, YouTube', '"Protected payments" explainer (uses the real landing ledger demo)', 'Protected payments (HOLD)', '⛔ HOLD until licensed PSP + owner sign-off'),
 'SWQ-V10-saudi-ar-22s-9x16': ('Snapchat (primary), TikTok, Reels, X', 'Saudi-flavoured variant (Orion voice, Riyadh, SAR prices)', 'Saudi', '✅ Ready after Riyadh gate (30 agencies)'),
 'SWQ-V11-jordan-ar-16s-9x16': ('Reels, FB, TikTok', 'Jordan-flavoured variant (Amman)', 'Jordan', '✅ Ready'),
 'SWQ-V12-hero-protected-ar-HOLD-9x16': ('as V01', 'Hero with the escrow line «المبلغ ينتظر موافقتك» ("the money waits for your approval")', 'Protected payments (HOLD)', '⛔ HOLD until licensed PSP + owner sign-off'),
 'SWQ-V13-hero-en-9x16': ('Reels, TikTok, LinkedIn (EN audiences, expats)', 'Hero in English (English UI)', 'Hero & "find in a minute"', '✅ Ready'),
}
S = {  # still prefix → (platform, message, copy section, status)
 'M1-find': ('Meta feed/stories, TikTok, Snap', 'Find an agency in a minute', 'Hero & "find in a minute"', '✅'),
 'M1-SA-find': ('Snap, Meta KSA', 'Find (Saudi)', 'Saudi', '✅ after Riyadh gate'),
 'M1-JO-find': ('Meta JO', 'Find (Jordan)', 'Jordan', '✅'),
 'M2-real-work': ('Meta, TikTok, Snap', 'See real work before you pay', 'See real work', '✅'),
 'M3-milestones-HOLD': ('Meta, Snap', 'Pay per milestone, protected', 'Protected payments (HOLD)', '⛔ HOLD'),
 'M3b-milestone-contract': ('Meta, LinkedIn', 'Clear contract in milestones (launch-safe)', 'Milestone contracts, launch-safe', '✅'),
 'M4-first-arabic': ('All (brand)', 'First Arabic platform', 'Hero & "find in a minute"', '✅ after legal sign-off on the claim'),
 'M5-agencies': ('Meta, LinkedIn, TikTok', 'Agencies: free showcase + client requests', 'Agencies', '✅'),
 'M5-SA-agencies': ('LinkedIn, Snap KSA', 'Agencies (Riyadh)', 'Agencies', '✅'),
}
out = ['# Asset manifest', '',
 'Everything the campaign needs, with where it runs, what it says, and which copy to pair it with (see `../copy/ad-copy.md`). Nothing has been posted. Every asset is waiting for owner approval.', '',
 '**Legend:** ✅ ready for approval · ⛔ HOLD (claim not yet true in production). "Demo" = real Sawwiq UI showing demo accounts, and the on-screen label says so. People in the photos and films are AI-generated (invented, not real people) and are illustrative.', '',
 '## 1. Logo sting and sonic logo (brand identity: lock after approval)', '', '| File | Size | Duration | Use |', '|---|---|---|---|']
for f in sorted(glob.glob(f'{M}/sting/*')):
    d, wh = probe(f); out.append(f'| `sting/{os.path.basename(f)}` | {wh or "audio"} · {os.path.getsize(f)/1e6:.2f} MB | {d:.1f} s | {"end of every video; mobile landing intro" if "9x16" in f else "YouTube, LinkedIn, X outro" if "16x9" in f else "feed outro" if "1x1" in f else "sonic logo: end of every audio or video"} |')
out += ['', 'The mobile landing intro uses `public/assets/brand/intro/sawwiq-intro-720.{webm,mp4}` (84 KB / 113 KB).', '',
 '## 2. Videos (masters as links; 720p previews in `video-previews/`)', '', '| ID | Format | Duration | Platforms | Message | Copy | Status | Master (link) | Preview |', '|---|---|---|---|---|---|---|---|---|']
for k, (pl, msg, cp, st) in V.items():
    pv = f'{M}/video-previews/{k}-preview.mp4'; d, _ = probe(pv); _, wh = probe(pv)
    fmt = '16:9 1920×1080' if '16x9' in k else '9:16 1080×1920'
    out.append(f'| {k} | {fmt} | {d:.1f} s | {pl} | {msg} | {cp} | {st} | [mp4]({links[k]}) | `video-previews/{k}-preview.mp4` |')
out += ['', '## 3. Static ads', '', '### 3.1 Key messages (AR and EN; 1:1 1080², 4:5 1080×1350, 9:16 1080×1920)', '', '| Message | Files | Platforms | Copy | Status |', '|---|---|---|---|---|']
for k, (pl, msg, cp, st) in S.items():
    fs = sorted(glob.glob(f'{M}/stills/key-messages/SWQ-{k}-*.jpg')); langs = sorted({re.search(r'-(ar|en)-', f)[1] for f in fs})
    out.append(f'| {msg} | `stills/key-messages/SWQ-{k}-{{{",".join(langs)}}}-{{1x1,4x5,9x16}}.jpg` ({len(fs)} files) | {pl} | {cp} | {st} |')
def listing(sub, title, note):
    fs = sorted(glob.glob(f'{M}/stills/{sub}/*.jpg'))
    rows = [f'### {title}', '', note, '', '| File | Pixels | KB |', '|---|---|---|']
    from PIL import Image
    for f in fs:
        w, h = Image.open(f).size; rows.append(f'| `stills/{sub}/{os.path.basename(f)}` | {w}×{h} | {os.path.getsize(f)//1024} |')
    return rows + ['']
out += [''] + listing('carousels', '3.2 Carousels (4:5, swipe order = number)', 'C1: "How to choose an agency" (businesses, education). C2: "4 reasons for agencies". Caption template C in `02-brand-kit.md`.')
out += listing('whatsapp-status', '3.3 WhatsApp status set (9:16)', 'Post one a day from the company WhatsApp Business account; copy in `ad-copy.md`, WhatsApp section.')
out += listing('covers', '3.4 Profile covers and banners', 'Facebook and YouTube are centred for mobile crop safety; LinkedIn company is 1128×191.')
out += listing('google-display', '3.5 Google Display (responsive and standard sizes)', 'Use the 1200×628 and 1200×1200 files in responsive display ads; the fixed sizes are for direct placements. Short headline on thin banners.')
out += ['## 4. Photo library (AI-generated, illustrative)', '', 'Bright keyframes for organic posts, blog headers and decks: `photos/SWQ-photo-K01…K09.jpg`. Never present them as a real client or real agency work.', '',
 '## 5. Production files', '', '- Prompts and job IDs: `../prompts/`. Edit lists: `../prompts/edit-lists/`.', '- Tools to rebuild or re-render: `../tools/`.', '- Higgsfield credits used this session: see `../README.md`.']
open(f'{M}/manifest.md', 'w').write('\n'.join(out) + '\n'); print('manifest lines', len(out))
