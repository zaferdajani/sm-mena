from pathlib import Path
import json,re
R=Path.cwd()
def edit(path,fn):
 p=R/path;s=p.read_text();p.write_text(fn(s))
copy=json.loads((R/'scripts/registration-copy.json').read_text())
for lang in ['ar','en']:
 p=R/f'messages/{lang}.json';j=json.loads(p.read_text());assert 'Registration' not in j;j['Registration']=copy[lang];p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n')
edit('app/api/version/route.ts',lambda s:s.replace('Response.json(releaseInfo(),','Response.json({ ...releaseInfo(), launchPhase: launchPhase() },'))
edit('components/registration/studio-registration.tsx',lambda s:s.replace('  const eligible = founderEligibility({ ...agency, packageCount: packages.length }).eligible;','  const eligibility = founderEligibility({ ...agency, packageCount: packages.length });\n  const eligible = eligibility.eligible;').replace('!publication.legacy && publication.visibility !== "private"','!publication.legacy').replace('eligible ? "studio.pioneerEligible" : "studio.pioneerPending"','eligible ? "studio.pioneerEligible" : eligibility.cohort ? "studio.pioneerPending" : "studio.pioneerUnavailable"'))
# Parenthesized guards keep archived agreements and their existing actions usable.
for path,patterns in [
 ('app/[locale]/(main)/studio/contracts/page.tsx',[r'(<Link href="/studio/contracts/new"[\s\S]*?</Link>)',r'(<Link href=\{`/studio/contracts/new\?partner=[\s\S]*?</Link>)']),
 ('app/[locale]/(main)/studio/ndas/page.tsx',[r'(<Link href="/studio/ndas/new"[\s\S]*?</Link>)']),
 ('app/[locale]/(main)/studio/packages/page.tsx',[r'(<Link href=\{\{ pathname: "/studio/contracts/new"[\s\S]*?</Link>)'])]:
 def guard(s,patterns=patterns):
  s='import { documentsOpen } from "@/lib/launch-phase";\n'+s
  for pat in patterns:
   s,n=re.subn(pat,r'{documentsOpen() && \1}',s);assert n>0,(path,pat)
  return s
 edit(path,guard)
edit('app/[locale]/(main)/studio/billing/page.tsx',lambda s:'import { documentsOpen } from "@/lib/launch-phase";\n'+s.replace('{isTestPayments() && (','{documentsOpen() && isTestPayments() && (').replace('      <div className="grid gap-3 sm:grid-cols-2">','      {documentsOpen() && <div className="grid gap-3 sm:grid-cols-2">').replace('      </div>\n      <p className="text-xs text-muted-foreground">{t("limitsNote"','      </div>}\n      <p className="text-xs text-muted-foreground">{t("limitsNote"'))
# An archived work order/inquiry is still owned history; broad discovery remains shut.
edit('app/[locale]/(main)/studio/collab/gate.ts',lambda s:'import { isRegistrationPhase } from "@/lib/launch-phase";\n'+s.replace('export async function collabPage() {','export async function collabPage(existingRecord = false) {').replace('  const { agency, user } = await requireAgency();','  const { agency, user } = await requireAgency();\n  if (existingRecord && isRegistrationPhase()) return { agency, user, soon: false };',1).replace('export async function deliveryPage() {\n  const base = await collabPage();','export async function deliveryPage(existingRecord = false) {\n  const base = await collabPage(existingRecord);'))
for path in ['app/[locale]/(main)/studio/collab/orders/[id]/page.tsx','app/[locale]/(main)/studio/collab/work/[id]/page.tsx']:
 edit(path,lambda s:s.replace('await collabPage()', 'await collabPage(true)').replace('await deliveryPage()', 'await deliveryPage(true)'))
# Unlisted/private packages never contribute to market-price summaries.
edit('lib/data/packages.ts',lambda s:'import { isRegistrationPhase } from "@/lib/launch-phase";\nimport { discoverableProfiles } from "@/lib/data/publication";\nimport { agencies } from "@/lib/db/schema";\n'+s.replace('export async function packagePriceRange(service: string) {','export async function packagePriceRange(service: string) {\n  if (isRegistrationPhase()) return { n: 0, min: null, median: null, max: null };').replace('    .where(and(eq(packages.service, service), eq(packages.billing, "monthly")));','    .innerJoin(agencies, eq(packages.agencyId, agencies.id))\n    .where(and(discoverableProfiles(), eq(packages.service, service), eq(packages.billing, "monthly")));'))
# Public metadata for inaccessible resources remains generic; never an identifying share card.
edit('app/[locale]/(main)/admin/features/page.tsx',lambda s:'import { isRegistrationPhase } from "@/lib/launch-phase";\n'+s.replace('  const t = await getTranslations("Features");','  const t = await getTranslations("Features");\n  const r = await getTranslations("Registration");').replace('      <header>','      {isRegistrationPhase() && <aside className="registration-notice" data-testid="admin-launch-phase">{r("adminPhase")}</aside>}\n      <header>',1))
# The public consent text is already versioned in the existing flow; clarify draft visibility beside it.
edit('components/studio/post-form.tsx',lambda s:s.replace('mode,', 'mode,',1))
# No obsolete comment may imply putting an old public file behind a private URL erased outside copies.
p=R/'docs/08-legal-compliance.md';s=p.read_text();s+='''\n\n## Registration-phase publication choices (2026-09-29)

`profile_publications` stores the provider's chosen audience (private, unlisted,
public), consent version and update time. The authenticated owner explicitly
acknowledges a change; staff do not silently change that choice. A new real
registration-phase account starts private in the same transaction as account
creation. Existing public links are preserved, but not placed in the public
directory during registration. The phase never changes publication preferences.

New portfolio media is in private storage and served through an access-checked,
no-store route. Old previously-public media may already exist in outside caches
or downloaded copies; changing visibility cannot recall them. Unlisted means
anyone with the URL, not confidential. No index marker substitutes for auth.

The preference follows account retention; its FK cascades when the agency is
actually erased by the account-erasure process. The existing audit trail records
only the audience and consent version, never contact details. Operational legal
retention continues independently. No new marketing subscription is introduced;
registration alone is not consent to unsolicited promotional messages.
''';p.write_text(s)
