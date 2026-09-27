from pathlib import Path
import re
r=Path.cwd()
def edit(p,fn):
 f=r/p;old=f.read_text();new=fn(old);assert new!=old,p;f.write_text(new)
def put(p,s):
 f=r/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(s)
edit('app/[locale]/layout.tsx',lambda s:re.sub(r'const plexArabic = IBM_Plex_Sans_Arabic\([\s\S]*?\n\}\);\n\nexport function', '''// Approved reference: Sawwiq_Saudi_Brochure_Corrected.pdf.
// One self-hosted variable family for all Arabic/Latin UI text and headings.
const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

export function''',s.replace('import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic, Readex_Pro } from "next/font/google";','import { Noto_Sans_Arabic } from "next/font/google";').replace('className={`${plexArabic.variable} ${readex.variable} ${plexMono.variable} h-full antialiased`}','className={`${notoArabic.variable} h-full antialiased`}\n      data-design-system="brochure-v1"').replace('import "../globals.css";','import "../globals.css";\nimport "../styles/brochure.css";')))
s=(r/'app/globals.css').read_text()
start=s.index(':root {');end=s.index('\n}\n',start)+2
s=s[:start]+''':root {
  /* Colours sampled from the owner-approved corrected brochure. */
  --radius: 1rem;
  --background: #f8f6ef;
  --foreground: #102e25;
  --card: #fffdf7;
  --card-foreground: #102e25;
  --popover: #fffdf7;
  --popover-foreground: #102e25;
  --primary: #106b4c;
  --primary-foreground: #ffffff;
  --secondary: #e4ede2;
  --secondary-foreground: #123f2f;
  --muted: #ecefe5;
  --muted-foreground: #4c6257;
  --accent: #e5ede0;
  --accent-foreground: #145137;
  --destructive: #b3261e;
  --warning: #80561b;
  --border: #d6ddd4;
  --input: #a4b6a8;
  --ring: #106b4c;
  --brand: #106a4c;
  --brand-deep: #123f2f;
  --brand-soft: #ecefe5;
  --brand-tint: #e5ede0;
  --brand-line: #b7cbbb;
  --gold: #c19a4f;
  --gold-soft: #f0cf82;
  --gold-ink: #6d592f;
  --chart-1: #106b4c;
  --shadow-card: 0 2px 10px rgb(16 46 37 / 0.035);
  --shadow-lift: 0 8px 24px rgb(16 46 37 / 0.09);
  --ease-desk: cubic-bezier(0.2, 0.7, 0.2, 1);
  /* Compatibility for independently owned sections; no legacy font loads. */
  --font-plex-arabic: var(--font-noto-arabic);
  --font-readex: var(--font-noto-arabic);
  --font-plex-mono: var(--font-noto-arabic);
}'''+s[end:]
start=s.index('/* The pre-launch teaser');end=s.index('\n@theme inline',start)
s=s[:start]+'''/* Dark is still a visitor choice; the founder page no longer forces night mode. */
:root[data-theme="dark"] {
  color-scheme: dark;
  --background: #10241d;
  --foreground: #f8f6ef;
  --card: #18352a;
  --card-foreground: #f8f6ef;
  --popover: #18352a;
  --popover-foreground: #f8f6ef;
  --primary: #8bc6a6;
  --primary-foreground: #102e25;
  --secondary: #284538;
  --secondary-foreground: #f8f6ef;
  --muted: #233f32;
  --muted-foreground: #b9ccbd;
  --accent: #2a493b;
  --accent-foreground: #e5ede0;
  --destructive: #ffaba2;
  --warning: #f0cf82;
  --border: #486457;
  --input: #6c8978;
  --ring: #8bc6a6;
  --brand: #a5d7b6;
  --brand-deep: #b9e4c9;
  --brand-soft: #233f32;
  --brand-tint: #2a493b;
  --brand-line: #547761;
  --gold-ink: #f0cf82;
  --chart-1: #8bc6a6;
}
''' + s[end:]
s=s.replace('--font-sans: "Twemoji Country Flags", var(--font-plex-arabic), system-ui, sans-serif;','--font-sans: "Twemoji Country Flags", var(--font-noto-arabic), Arial, sans-serif;').replace('--font-heading: "Twemoji Country Flags", var(--font-readex), var(--font-plex-arabic), system-ui, sans-serif;','--font-heading: "Twemoji Country Flags", var(--font-noto-arabic), Arial, sans-serif;').replace('--font-mono: var(--font-plex-mono), ui-monospace, monospace;','--font-mono: ui-monospace, "SFMono-Regular", Consolas, monospace;\n  --text-xs: 0.8125rem;\n  --text-xs--line-height: 1.65;\n  --text-sm: 0.9375rem;\n  --text-sm--line-height: 1.7;\n  --text-base--line-height: 1.8;')
s=s.replace('/* Display face for headings (Readex Pro, Arabic + Latin); no tracking on Arabic. */','/* Same Noto family as the approved brochure, with readable Arabic line boxes. */').replace('  h2 {\n    font-family: var(--font-heading);\n    font-weight: 600;','  h2,\n  h3 {\n    font-family: var(--font-heading);\n    font-weight: 800;\n    line-height: 1.5;')
s=s.replace('    @apply bg-background text-foreground;','    @apply bg-background text-foreground;\n    line-height: 1.8;')
s=s.replace('border-end-start-radius: 4px;', 'border-end-start-radius: 18px;').replace('0 10px 24px -10px rgb(14 107 70 / 0.55)','var(--shadow-card)').replace('0 14px 30px -10px rgb(14 107 70 / 0.65)','var(--shadow-lift)')
(r/'app/globals.css').write_text(s)
edit('lib/release.ts',lambda s:s.replace('layout-2026-09-27-v1','brochure-2026-09-27-v1'))
put('components/brand-lockup.tsx','''import Image from "next/image";

/** The actual Sawwiq mark and Noto wordmark from the approved brochure. */
export function BrandLockup({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <span className={`sw-brand-lockup${compact ? " sw-brand-lockup--compact" : ""}`} role="img" aria-label={label} data-testid="brand-lockup" dir="rtl" translate="no">
      <Image src="/brand/mark-192.png" alt="" width={44} height={44} priority />
      <span className="sw-brand-wordmark" lang="ar" aria-hidden="true">سوّق</span>
    </span>
  );
}
''')
edit('components/shell/app-shell.tsx', lambda s:s.replace('import Image from "next/image";', 'import { BrandLockup } from "@/components/brand-lockup";').replace('<div className="min-h-dvh md:flex">','<div className="sw-app min-h-dvh md:flex" data-design-surface="app">').replace('<Image src="/brand/mark-192.png" alt="" width={32} height={32} className="rounded-lg" priority />\n          {th("brand")}','<BrandLockup label={th("brand")} />').replace('<Image src="/brand/mark-192.png" alt="" width={28} height={28} className="rounded-md" priority />{th("brand")}','<BrandLockup label={th("brand")} compact />').replace('<div className="flex min-w-0 items-center gap-1">','<div className="sw-app-tools flex min-w-0 items-center gap-1">'))
edit('app/[locale]/(auth)/layout.tsx',lambda s:s.replace('import Image from "next/image";','import { BrandLockup } from "@/components/brand-lockup";').replace('className="flex min-h-dvh','data-design-surface="auth" className="sw-auth flex min-h-dvh').replace('<Image src="/brand/mark-192.png" alt="" width={40} height={40} className="rounded-xl" priority />\n        {t("brand")}','<BrandLockup label={t("brand")} />').replace('w-full max-w-sm rounded-2xl border bg-card p-6 shadow-card','sw-auth-card w-full max-w-lg rounded-2xl border bg-card p-6 shadow-card'))
edit('components/landing/sections.tsx',lambda s:s.replace('import { CountryPicker }','import { BrandLockup } from "@/components/brand-lockup";\nimport { CountryPicker }',1).replace('<img alt="" height={32} src="/assets/brand/mark.png" width={32} />\n        <span>{c.brand}</span>','<BrandLockup label={c.brand} />'))
edit('components/landing/sawwiq-page.tsx',lambda s:s.replace('data-country={country} data-lang={lang}', 'data-country={country} data-lang={lang} data-design-surface="landing"'))
for p in ['app/[locale]/(main)/studio/layout.tsx','app/[locale]/(main)/admin/layout.tsx']:
 edit(p,lambda s:s.replace('className="mx-auto w-full max-w-', 'data-design-surface="workspace" className="sw-workspace mx-auto w-full max-w-',1).replace('className="px-4 py-5"','className="sw-workspace-body px-4 py-5"'))
edit('components/studio/studio-nav.tsx',lambda s:s.replace('<nav className="flex gap-1','<nav className="sw-workspace-nav flex gap-1'))
edit('components/ui/button.tsx',lambda s:s.replace('text-sm font-medium whitespace-nowrap','text-sm font-semibold whitespace-normal text-center leading-relaxed').replace('"h-8 gap-1.5 px-2.5','"min-h-11 h-auto gap-2 px-4 py-2').replace('xs: "h-6 gap-1','xs: "min-h-9 h-auto gap-1 py-1').replace('sm: "h-7 gap-1','sm: "min-h-10 h-auto gap-1 py-1.5').replace('lg: "h-9 gap-1.5 px-2.5','lg: "min-h-12 h-auto gap-2 px-5 py-2.5').replace('icon: "size-8"','icon: "size-11"').replace('"icon-lg": "size-9"','"icon-lg": "size-12"'))
edit('components/ui/input.tsx',lambda s:s.replace('h-8 w-full','min-h-11 w-full').replace('bg-transparent px-2.5 py-1','bg-card px-3 py-2').replace(' md:text-sm',''))
edit('components/ui/textarea.tsx',lambda s:s.replace('min-h-16','min-h-28').replace('bg-transparent px-2.5 py-2','bg-card px-3 py-2.5').replace(' md:text-sm',''))
edit('components/profile/profile-layout.module.css',lambda s:s.replace('font-family: var(--font-readex), sans-serif;','font-family: var(--font-heading);').replace('font-size: .7rem;','font-size: .8125rem;').replace('font-size: .75rem;','font-size: .8125rem;').replace('font-size: .8rem;','font-size: .875rem;').replace('font-size: .85rem;','font-size: .9375rem;').replace('font-size: .95rem;','font-size: 1rem;').replace('font-weight: 700;\n  text-wrap: pretty;','font-weight: 800;\n  text-wrap: pretty;').replace('border-radius: 1.5rem;','border-radius: var(--radius-xl);').replace('border-block-start: 4px solid var(--primary);','border-block-start: 4px solid var(--gold);').replace('background: color-mix(in srgb, var(--primary) 4%, var(--card));','background: var(--brand-tint);').replace('background: color-mix(in srgb, #c69e43 12%, var(--card));','background: color-mix(in srgb, var(--gold) 12%, var(--card));').replace('border-color: color-mix(in srgb, #c69e43 40%, var(--border));','border-color: color-mix(in srgb, var(--gold) 40%, var(--border));'))
edit('components/landing/scenes.ts',lambda s:s.replace('"#0E6B46"','"#106B4C"').replace('"#F2F2ED"','"#F8F6EF"').replace('"#10231A"','"#102E25"').replace('"#4C5C53"','"#4C6257"'))
edit('components/teaser/share-button.tsx',lambda s:s.replace('rounded-full bg-[#25d366] px-5 py-2.5 text-sm font-bold text-black','min-h-11 rounded-xl border border-brand-line bg-card px-5 py-2.5 text-sm font-bold text-brand').replace('rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white','min-h-11 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground'))
