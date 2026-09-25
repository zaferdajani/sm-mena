#!/usr/bin/env python3
"""Assemble a Sawwiq film from an edit list (JSON). See marketing/prompts/04-edit-lists.md."""
import json, os, subprocess, sys, urllib.parse, hashlib, re
S = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(S)
FF = 'ffmpeg'
def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(' '.join(cmd)[:600]); print(r.stderr[-2000:]); sys.exit(1)
    return r
def render(page, q, w, h, out, transparent=True):
    if os.path.exists(out): return out
    job = [{"html": os.path.join(S, page), "out": out, "w": w, "h": h, "q": '?' + urllib.parse.urlencode(q), "transparent": transparent}]
    jf = out + '.json'; json.dump(job, open(jf, 'w'))
    run(['node', os.path.join(ROOT, 'render/render.js'), '--batch', jf]); os.remove(jf); return out
def key(*a): return hashlib.md5(json.dumps(a, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:10]
def dur(f):
    r = subprocess.run([FF, '-i', f], capture_output=True, text=True).stderr
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r); return int(m[1])*3600+int(m[2])*60+float(m[3])

def seg_clip(s, W, H, out):
    sp = s.get('speed', 1.0); d = s['dur']
    vf = f"setpts=PTS/{sp},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},fps=30,format=yuv420p,tpad=stop_mode=clone:stop_duration=2"
    if s.get('zoom'): vf = f"setpts=PTS/{sp},scale={int(W*1.08)}:{int(H*1.08)}:force_original_aspect_ratio=increase,crop={W}:{H},fps=30,format=yuv420p"
    af = f"atempo={sp},volume={s.get('amb',0.3)},aformat=sample_rates=48000:channel_layouts=stereo,apad" if s.get('amb',0.3) > 0 else "volume=0,aformat=sample_rates=48000:channel_layouts=stereo,apad"
    run([FF,'-y','-v','error','-ss',str(s.get('in',0)),'-i',os.path.join(ROOT,s['src']),'-t',str(d*sp),'-vf',vf,'-af',af,
         '-c:v','libx264','-crf','16','-preset','medium','-c:a','aac','-b:a','192k','-t',str(d),out])

def seg_ui(s, W, H, lang, out, cache):
    wide = W > H
    box = (260, 90, 450, 900) if wide else (190, 430, 700, 1400)
    if s.get('box'): box = tuple(s['box'])
    q = {'lang': lang, 'box': ','.join(map(str, box)), 't': s.get('head',''), 's': s.get('sub',''), 'chip': s.get('chip',''), 'demo': s.get('demo','')}
    if not wide and q['demo']: q['s'] = (q['s'] + '<br>' if q['s'] else '') + f"<span style='font-size:26px'>{q['demo']}</span>"; q['demo'] = ''
    bg = render('ui.html', {**q, 'mode': 'bg'}, W, H, os.path.join(cache, 'uibg2-' + key(q, W, H) + '.png'), transparent=False)
    fr = render('ui.html', {**q, 'mode': 'frame'}, W, H, os.path.join(cache, 'uifr-' + key(q, W, H) + '.png'))
    x, y, w, h = box; sp = s.get('speed', 1.0); d = s['dur']
    fc = (f"[1:v]setpts=PTS/{sp},scale={w}:{h}:flags=lanczos,fps=30,format=rgba,"
          f"geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(pow(max(0,max({int(w*0.11)}-X,X-{w-int(w*0.11)})),2)+pow(max(0,max({int(w*0.11)}-Y,Y-{h-int(w*0.11)})),2),pow({int(w*0.11)},2)),255,0)'[rec];"
          f"[0:v][rec]overlay={x}:{y}[a];[a][2:v]overlay=0:0,fps=30,format=yuv420p[v]")
    run([FF,'-y','-v','error','-loop','1','-t',str(d),'-i',bg,'-ss',str(s.get('in',0)),'-i',os.path.join(ROOT,s['rec']),'-loop','1','-t',str(d),'-i',fr,
         '-f','lavfi','-t',str(d),'-i','anullsrc=r=48000:cl=stereo','-filter_complex',fc,'-map','[v]','-map','3:a',
         '-c:v','libx264','-crf','16','-preset','medium','-c:a','aac','-t',str(d),out])

def seg_sting(s, W, H, lang, out, cache):
    src = os.path.join(ROOT, s['src']); hold = s.get('hold', 1.6); base = dur(src)
    inputs = ['-i', src]; fc = f"[0:v]scale={W}:{H},fps=30,format=yuv420p,tpad=stop_mode=clone:stop_duration={hold}[b]"; last = 'b'
    if s.get('endcard'):
        ec = render('endcard.html', {'lang': lang, **s['endcard']}, W, H, os.path.join(cache, 'end-' + key(s['endcard'], W, H, lang) + '.png'))
        inputs += ['-loop', '1', '-t', str(base + hold), '-i', ec]
        fc += f";[1:v]format=rgba,fade=in:st={s.get('card_at',3.3)}:d=0.35:alpha=1[e];[b][e]overlay=0:0:shortest=1,format=yuv420p[v]"; last = 'v'
    run([FF,'-y','-v','error',*inputs,'-filter_complex',fc + f";[0:a]aformat=sample_rates=48000:channel_layouts=stereo,apad[a]",'-map',f'[{last}]','-map','[a]',
         '-c:v','libx264','-crf','16','-preset','medium','-c:a','aac','-b:a','192k','-t',str(base + hold),out])

def build(el):
    W, H = el['size']; lang = el.get('lang', 'ar'); name = el['name']
    cache = os.path.join(S, 'cache'); os.makedirs(cache, exist_ok=True); tmp = os.path.join(cache, name); os.makedirs(tmp, exist_ok=True)
    parts = []
    for i, s in enumerate(el['segments']):
        out = os.path.join(tmp, f'seg{i:02d}.mp4')
        {'clip': lambda: seg_clip(s, W, H, out), 'ui': lambda: seg_ui(s, W, H, lang, out, cache), 'sting': lambda: seg_sting(s, W, H, lang, out, cache)}[s['type']]()
        parts.append(out)
    lst = os.path.join(tmp, 'list.txt'); open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
    joined = os.path.join(tmp, 'joined.mp4'); run([FF,'-y','-v','error','-f','concat','-safe','0','-i',lst,'-c','copy',joined])
    total = dur(joined)
    # captions + VO
    ins = ['-i', joined]; fc = []; v = '0:v'; n = 1
    for j, c in enumerate(el.get('captions', [])):
        png = render('caption.html', {'lang': lang, 't': c['t'], 's': c.get('s', ''), **({'y': c['y']} if 'y' in c else {})}, W, H, os.path.join(cache, 'cap-' + key(c, W, H, lang) + '.png'))
        ins += ['-loop', '1', '-t', str(total), '-i', png]
        a, b = c['start'], c['end']
        fc.append(f"[{n}:v]format=rgba,fade=in:st={a}:d=0.2:alpha=1,fade=out:st={b-0.2}:d=0.2:alpha=1[c{j}];[{v}][c{j}]overlay=0:0:enable='between(t,{a},{b})'[v{j}]"); v = f'v{j}'; n += 1
    amix = ['[0:a]volume=1.0[bed]']; labels = ['[bed]']
    for k, vo in enumerate(el.get('vo', [])):
        ins += ['-i', os.path.join(ROOT, vo['src'])]
        ms = int(vo['at'] * 1000)
        amix.append(f"[{n}:a]silenceremove=start_periods=1:start_threshold=-45dB,highpass=f=80,atempo={vo.get('tempo',1.2)},aformat=sample_rates=48000:channel_layouts=stereo,volume={vo.get('gain',1.0)},adelay={ms}|{ms}[vo{k}]"); labels.append(f'[vo{k}]'); n += 1
    amix.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:duration=first[mix]")
    fc_all = ';'.join(fc + amix) if fc else ';'.join(amix)
    vmap = f'[{v}]' if fc else '0:v'
    pre = os.path.join(tmp, 'pre.mp4')
    run([FF,'-y','-v','error',*ins,'-filter_complex',fc_all,'-map',vmap,'-map','[mix]','-c:v','libx264','-crf','18','-preset','medium','-pix_fmt','yuv420p','-c:a','pcm_s16le','-t',str(total),pre.replace('.mp4','.mov')])
    pre = pre.replace('.mp4', '.mov')
    # loudness: one constant gain to target, true-peak ceiling only
    r = subprocess.run([FF,'-i',pre,'-af','loudnorm=print_format=json','-f','null','-'], capture_output=True, text=True).stderr
    I = float(re.search(r'"input_i" : "(-?[\d.]+)"', r)[1]); g = el.get('lufs', -14) - I
    out = os.path.join(ROOT, 'final', name + '.mp4'); os.makedirs(os.path.dirname(out), exist_ok=True)
    run([FF,'-y','-v','error','-i',pre,'-af',f'volume={g:.2f}dB,alimiter=limit=0.84:attack=1:release=50:level=disabled','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',out])
    print(name, f'{total:.2f}s', f'gain {g:+.1f}dB', f'{os.path.getsize(out)/1e6:.1f}MB')

if __name__ == '__main__':
    for f in sys.argv[1:]:
        for el in json.load(open(f)): build(el)
