from pathlib import Path
import re,json
R=Path.cwd()
def edit(path,fn):
 p=R/path;old=p.read_text();new=fn(old);assert old!=new,path;p.write_text(new)
# Repair a multiline union without changing its other error variants.
edit('lib/data/contracts.ts',lambda s:s.replace('= "unavailable" |\n  |','= "unavailable"\n  |'))
edit('app/[locale]/layout.tsx',lambda s:s.replace('import "../globals.css";','import "../globals.css";\nimport "../styles/registration.css";'))
for path in ['app/[locale]/(landing)/page.tsx','app/[locale]/(landing)/soon/page.tsx']:
 def landing(s):
  s='import { RegistrationView } from "@/components/registration/registration-view";\nimport { isRegistrationPhase } from "@/lib/launch-phase";\n'+s
  s=s.replace('  const { locale } = await params;\n  const t = await getTranslations', '''  const { locale } = await params;
  if (isRegistrationPhase()) {
    const r = await getTranslations({ locale, namespace: "Registration" });
    return pageMeta({ locale, path: "" , title: r("metaTitle"), absoluteTitle: true, description: r("metaDescription") });
  }
  const t = await getTranslations''',1)
  s=s.replace('  setRequestLocale(locale);','  setRequestLocale(locale);\n  if (isRegistrationPhase()) return <RegistrationView locale={locale} />;',1)
  return s
 edit(path,landing)
# Example is read-only and honest: same profile layout, no fake followers, reviews, prices or mutation controls.
def profile_header(s):
 s=s.replace('inquirySlot, servesNote, followersHref }:','inquirySlot, servesNote, followersHref, previewOnly = false, registrationMode = false }:')
 s=s.replace('agency: ProfileData; following: boolean;', 'agency: ProfileData; following: boolean; previewOnly?: boolean; registrationMode?: boolean;')
 s=s.replace('  const t = useTranslations("Profile");','  const t = useTranslations("Profile");\n  const tRegistration = useTranslations("Registration");\n  const readOnly = previewOnly || registrationMode;')
 s=s.replace('<Link key={s} href={`/hire/${s}`} className={styles.service}><bdi dir="auto">{serviceLabel(s, locale)}</bdi></Link>', '{readOnly ? <span key={s} className={styles.service}><bdi dir="auto">{serviceLabel(s, locale)}</bdi></span> : <Link key={s} href={`/hire/${s}`} className={styles.service}><bdi dir="auto">{serviceLabel(s, locale)}</bdi></Link>}')
 # The mapped expression must be an expression, not a second JSX brace.
 s=s.replace('agency.services.map((s) => (\n              {readOnly ?', 'agency.services.map((s) => (\n              readOnly ?').replace('</bdi></Link>}\n            ))}', '</bdi></Link>\n            ))}')
 s=s.replace('        <dl className={styles.stats}>','        {!readOnly && <dl className={styles.stats}>',1).replace('        </dl>\n      </div>','        </dl>}\n      </div>',1)
 s=s.replace('        {agency.startingPriceJod ?', '        {previewOnly && <p className="registration-note">{tRegistration("examples.contactNotice")}</p>}\n        {!previewOnly && agency.startingPriceJod ?')
 s=s.replace('        <div className={styles.secondaryActions}>','        {!readOnly && <div className={styles.secondaryActions}>',1).replace('        </div>\n        {hasContactLinks', '        </div>}\n        {hasContactLinks',1)
 s=s.replace('{agency.memberNo ?', '{!readOnly && agency.memberNo ?')
 return s
edit('components/profile/profile-header.tsx',profile_header)
edit('app/[locale]/(main)/a/[handle]/page.tsx',lambda s:'import { isRegistrationPhase } from "@/lib/launch-phase";\n'+s.replace('{!agency.isDemo && <JsonLd','{(await mayIndexAgency(agency)) && <JsonLd').replace('      <ProfileHeader\n','      <ProfileHeader registrationMode={isRegistrationPhase()}\n').replace('memberNo: agency.foundingSeat,','memberNo: isRegistrationPhase() ? null : agency.foundingSeat,'))
edit('app/[locale]/(main)/a/[handle]/c/[client]/page.tsx',lambda s:s.replace('noindex: data.agency.isDemo || data.agency.status !== "active",','noindex: !(await mayIndexAgency(data.agency)),') )
# The default social graph isn't an early-stage navigation destination.
def shell(s):
 s='import { isRegistrationPhase } from "@/lib/launch-phase";\n'+s
 s=s.replace('  const t = await getTranslations("Nav");','  const t = await getTranslations("Nav");\n  const reg = isRegistrationPhase();\n  const rt = await getTranslations("Registration");')
 s=s.replace('  const items: NavItem[] = [','  const items: NavItem[] = reg ? [\n    { href: "/", label: rt("navHome"), icon: "home" },\n    { href: "/examples", label: rt("navExamples"), icon: "explore" },\n    isStaffRole(user?.role) ? { href: "/admin", label: t("admin"), icon: "admin" } : user?.role === "agent" ? { href: "/agent", label: t("agent"), icon: "studio" } : user && user.role !== "client" ? { href: "/studio", label: t("studio"), icon: "studio" } : { href: "/start", label: t("join"), icon: "join" },\n  ] : [',1)
 s=s.replace('...items.slice(0, 3), { href: "/hire", label: t("hire"), icon: "hire" }, ...items.slice(3),','...items.slice(0, 3), ...(!reg ? [{ href: "/hire", label: t("hire"), icon: "hire" } as NavItem] : []), ...items.slice(3),')
 s=s.replace('        <DemoBanner />','        {!reg && <DemoBanner />}')
 return s
edit('components/shell/app-shell.tsx',shell)
edit('components/shell/site-footer.tsx',lambda s:'import { RegistrationFooter } from "@/components/registration/registration-view";\nimport { isRegistrationPhase } from "@/lib/launch-phase";\n'+s.replace('export async function SiteFooter() {','export async function SiteFooter() {\n  if (isRegistrationPhase()) return <RegistrationFooter />;'))
edit('app/[locale]/(main)/studio/layout.tsx',lambda s:'import { RegistrationStudioShell } from "@/components/registration/studio-shell";\nimport { isRegistrationPhase, isLaunchPilot } from "@/lib/launch-phase";\n'+s.replace('  const { agency } = await requireAgency();','  const { agency } = await requireAgency();\n  if (isRegistrationPhase() && !isLaunchPilot(agency.handle)) return <RegistrationStudioShell agency={agency}>{children}</RegistrationStudioShell>;',1))
edit('app/[locale]/(main)/studio/page.tsx',lambda s:'import { StudioRegistration } from "@/components/registration/studio-registration";\nimport { isRegistrationPhase, isLaunchPilot } from "@/lib/launch-phase";\n'+s.replace('  const { agency } = await requireAgency();','  const { agency } = await requireAgency();\n  if (isRegistrationPhase() && !isLaunchPilot(agency.handle)) return <StudioRegistration agency={agency} />;',1))
edit('app/[locale]/(auth)/join/page.tsx',lambda s:'import { isRegistrationPhase } from "@/lib/launch-phase";\n'+s.replace('  const tb = await getTranslations("BehanceImport.shortcut");','  const tb = await getTranslations("BehanceImport.shortcut");\n  const r = await getTranslations("Registration");').replace('      <h1 className="text-xl font-bold">{t("joinTitle")}</h1>','      <h1 className="text-xl font-bold">{isRegistrationPhase() ? r("joinTitle") : t("joinTitle")}</h1>\n      {isRegistrationPhase() && <aside className="registration-notice" data-testid="registration-join-notice"><strong>{r("phaseLabel")}</strong><p>{r("joinNotice")}</p><Link href="/examples">{r("exampleCta")}</Link></aside>}'))
# The shared choices retain sign-in and account roles. Browsing becomes an honest demonstration link.
edit('app/[locale]/(auth)/start/page.tsx',lambda s:'import { isRegistrationPhase } from "@/lib/launch-phase";\n'+s.replace('  const t = await getTranslations("Start");','  const t = await getTranslations("Start");\n  const r = await getTranslations("Registration");').replace('      <h1 className="text-xl font-bold">','      {isRegistrationPhase() && <aside className="registration-notice">{r("phaseLabel")}<p>{r("joinNotice")}</p></aside>}\n      <h1 className="text-xl font-bold">',1).replace('href="/explore" className="text-center', 'href={isRegistrationPhase() ? "/examples" : "/explore"} className="text-center').replace('{t("clientBrowse")}','{isRegistrationPhase() ? r("exampleCta") : t("clientBrowse")}'))
edit('app/[locale]/(main)/demo/page.tsx',lambda s:'import { isRegistrationPhase } from "@/lib/launch-phase";\nimport { redirect } from "@/i18n/navigation";\n'+s.replace('  setRequestLocale(locale);','  setRequestLocale(locale);\n  if (isRegistrationPhase()) redirect({ href: "/examples", locale });'))
# About must describe the actual phase, not advertise protected money that's unavailable.
edit('app/[locale]/(main)/about/page.tsx',lambda s:'import { RegistrationView } from "@/components/registration/registration-view";\nimport { isRegistrationPhase } from "@/lib/launch-phase";\n'+s.replace('  setRequestLocale(locale);','  setRequestLocale(locale);\n  if (isRegistrationPhase()) return <RegistrationView locale={locale} />;',1))
# Saved lists are existing user history, not a public directory. Respect changed profile visibility.
edit('app/[locale]/(main)/saved/page.tsx',lambda s:'import { discoverableProfiles } from "@/lib/data/publication";\n'+s.replace('eq(agencies.status, "active"))))','eq(agencies.status, "active"), discoverableProfiles())))'))
# Release evidence is separate from the chosen phase and from payments readiness.
edit('lib/release.ts',lambda s:re.sub(r'(export const UI_REVISION = ")[^"]+(";)',r'\g<1>registration-2026-09-29-v1\2',s))
edit('app/api/version/route.ts',lambda s:'import { launchPhase } from "@/lib/launch-phase";\n'+s.replace('Response.json(', 'Response.json(',1).replace('...releaseInfo()', '...releaseInfo(), launchPhase: launchPhase()'))
# Docs-phase overlays apply to feature pages and every new operation, not existing records.
edit('lib/feature-gate.ts',lambda s:s.replace('import { isStaffRole } from "@/lib/auth/permissions";','import { adminAccess } from "@/lib/auth/policy";\nimport { adminMfaRequired } from "@/lib/auth/mfa";').replace('staff: isStaffRole(user?.role)', 'staff: adminAccess(user, adminMfaRequired(), "agencies.view") === "ok"'))
# Test environments exercise the full product explicitly, never by weakening production defaults.
edit('vitest.config.mts',lambda s:s.replace('  test: {','  test: {\n    env: { LAUNCH_PHASE: "full" },'))
edit('playwright.config.ts',lambda s:s.replace('const e2eEnv = {','const e2eEnv = {\n  LAUNCH_PHASE: "full",'))
# Intentional media URL change: retain real image assertions in full-stage tests.
for p in (R/'tests/e2e').glob('*.ts'):
 s=p.read_text();new=s.replace('img[src*="/media/posts/"]','img[src*="/api/portfolio-media/"], img[src*="/media/posts/"]')
 if new!=s:p.write_text(new)
