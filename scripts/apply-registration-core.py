from pathlib import Path
import json,re
R=Path.cwd()
def edit(path, fn):
 p=R/path; old=p.read_text(); new=fn(old); assert new!=old, f'No change: {path}'; p.write_text(new)
def replace(s,a,b,n=-1):
 assert a in s, a[:100]
 return s.replace(a,b,n)
def prepend(path,text): edit(path,lambda s:text+'\n'+s)

# Explicit publication choices without rewriting existing accounts.
p=R/'lib/db/schema.ts'
s=p.read_text(); assert 'export const profilePublications' not in s
s+='''\n/** Draft/publication preference. Missing rows preserve existing public accounts. */
export const profilePublications = pgTable("profile_publications", {
  agencyId: uuid("agency_id").primaryKey().references(() => agencies.id, { onDelete: "cascade" }),
  visibility: text("visibility").$type<"private" | "unlisted" | "public">().notNull().default("private"),
  consentVersion: text("consent_version").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("profile_publications_visibility_idx").on(t.visibility), check("profile_publications_visibility_check", sql`${t.visibility} in ('private', 'unlisted', 'public')`)]);
''';p.write_text(s)
p=R/'lib/db/migrations/meta/_journal.json';j=json.loads(p.read_text());assert j['entries'][-1]['idx']==27
j['entries'].append({'idx':28,'version':'7','when':1790668000000,'tag':'0028_profile_publication','breakpoints':True});p.write_text(json.dumps(j,indent=2)+'\n')

def agency_edit(s):
 s='import { isRegistrationPhase, PUBLICATION_CONSENT_VERSION } from "@/lib/launch-phase";\nimport { discoverableProfiles } from "@/lib/data/publication";\n'+s
 s=s.replace('agencies, auditLogs, type Agency','agencies, auditLogs, profilePublications, type Agency')
 a=s.index('  const db = await getDb();',s.index('export async function createAgency('));b=s.index('\nexport async function updateAgency',a)
 s=s[:a]+'''  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(agencies).values({
      ...input, country: countryOfCity(input.city) ?? "jo", ...extra,
      handle: input.handle.toLowerCase(), ownerUserId, searchText: agencySearchText(input),
    }).returning();
    // The draft exists atomically with the account: never briefly public.
    if (!row.isDemo && isRegistrationPhase()) {
      await tx.insert(profilePublications).values({ agencyId: row.id, visibility: "private", consentVersion: PUBLICATION_CONSENT_VERSION });
    }
    return row;
  });
}
''' + s[b:]
 s=s.replace('Promise<AgencySummary[]> {\n  const db', 'Promise<AgencySummary[]> {\n  if (!(await (await import("@/lib/launch-access")).canBrowseDirectory())) return [];\n  const db')
 s=s.replace('const conditions = [eq(agencies.status, "active")];','const conditions = [eq(agencies.status, "active"), discoverableProfiles()];')
 s=s.replace('.where(and(eq(agencies.status, "active"), realUnless(includeDemo),', '.where(and(eq(agencies.status, "active"), discoverableProfiles(), realUnless(includeDemo),')
 return s
edit('lib/data/agencies.ts',agency_edit)

# Every new portfolio upload uses a private bucket and an access-checked URL.
edit('lib/storage/index.ts',lambda s:replace(replace(s,'const PRIVATE_PREFIXES = ["collab/"];','const PRIVATE_PREFIXES = ["collab/", "portfolio/"];'),'    url: (key) => {\n','    url: (key) => {\n      if (key.startsWith("portfolio/") && isSafeKey(key)) return `/api/portfolio-media/${key}`;\n'))
edit('lib/images.ts',lambda s:s.replace('`posts/${agencyId}/','`portfolio/${agencyId}/posts/').replace('`avatars/${agencyId}/','`portfolio/${agencyId}/avatars/').replace('`clients/${agencyId}/','`portfolio/${agencyId}/clients/'))
edit('app/api/portfolio-media/[...key]/route.ts',lambda s:s.replace('[a-f0-9-]+\\.(webp|png|jpg)', '[a-f0-9-]+(?:-t)?\\.(webp|png|jpg)'))

# Raw flags remain stored exactly as before. Launch phases are a second gate.
def features(s):
 s='import { launchAllowsFeature } from "@/lib/launch-phase";\n'+s
 s=s.replace('export function cachedFeatureState(key: FeatureKey): FeatureState {','export function cachedFeatureState(key: FeatureKey): FeatureState {\n  if (!launchAllowsFeature(key)) return "off";')
 s=s.replace('export async function featureState(key: FeatureKey): Promise<FeatureState> {','export async function featureState(key: FeatureKey): Promise<FeatureState> {\n  if (!launchAllowsFeature(key)) return "off";')
 s=s.replace('  const f = (await getFeatures())[key];','  if (!launchAllowsFeature(key, who)) return false;\n  const f = (await getFeatures())[key];',1)
 s=s.replace('export async function featureOnGlobally(key: FeatureKey) {','export async function featureOnGlobally(key: FeatureKey) {\n  if (!launchAllowsFeature(key)) return false;')
 return s
edit('lib/features.ts',features)
edit('lib/feature-gate.ts',lambda s:'import { launchAllowsFeature } from "@/lib/launch-phase";\n'+s.replace('  const f = (await getFeatures())[key];','  if (!launchAllowsFeature(key, await viewer())) return "off";\n  const f = (await getFeatures())[key];'))
# Block NEW documents/checkouts only. Existing signatures, settlement and reads remain intact.
for path,fn,union in [('lib/data/contracts.ts','createContract','ContractError'),('lib/data/ndas.ts','createNda','NdaError')]:
 def docs(s,fn=fn,union=union):
  s='import { documentsOpen } from "@/lib/launch-phase";\n'+s
  s=replace(s,f'export type {union} =',f'export type {union} = "unavailable" |',1)
  start=s.index(f'export async function {fn}(');body=s.index('\n',s.index(' {',s.index('Promise<',start)))
  s=s[:body]+'\n  if (!documentsOpen()) return { error: "unavailable" };'+s[body:]
  return s
 edit(path,docs)
edit('lib/data/payments.ts',lambda s:'import { documentsOpen } from "@/lib/launch-phase";\n'+re.sub(r'(export async function startPlanCheckout\([^\n]+\{)',r'\1\n  if (!documentsOpen()) throw new Error("unavailable");',s,count=1))

# Public reads check the policy themselves: a removed nav link is not access control.
def posts_edit(s):
 s='import { mayReadAgency, mayReadAgencyId, discoverableProfiles } from "@/lib/data/publication";\n'+s
 marker='  const conditions = filterConditions(filters);'
 s=replace(s,marker,'''  const allowed = filters.agencyId
    ? await mayReadAgencyId(filters.agencyId)
    : await (await import("@/lib/launch-access")).canBrowseDirectory();
  if (!allowed) return { items: [], nextCursor: null };
  const conditions = filterConditions(filters);
  if (!filters.agencyId) conditions.push(discoverableProfiles());''',1)
 s=replace(s,'  const views = await attachImages(rows);','  const readable = await Promise.all(rows.map(async (row) => await mayReadAgency(row.agency) ? row : null));\n  const views = await attachImages(readable.filter((row): row is (typeof rows)[number] => row !== null));',1)
 s=replace(s,'  if (!row) return null;\n  const isOwner', '  if (!row) return null;\n  if (ownerAgencyId !== row.agency.id && !(await mayReadAgency(row.agency))) return null;\n  const isOwner',1)
 return s
edit('lib/data/posts.ts',posts_edit)
for path,signature in [
 ('lib/matching/index.ts','export async function findMatches(need: Need, limit = 8): Promise<Match[]> {'),
 ('lib/matching/closest.ts','export async function closestAgencies(req: Requirements, { includeDemo = false, limit = 6 } = {}): Promise<CloseMatch[]> {'),
 ('lib/data/top.ts','export async function topAgencies(country: string, limit = 50): Promise<TopRow[]> {'),
 ('lib/data/who-runs.ts','export async function findWhoRuns(raw: string, { includeDemo = false } = {}): Promise<WhoRunsHit[]> {')]:
 def qedit(s,signature=signature):
  s='import { discoverableProfiles } from "@/lib/data/publication";\n'+s
  s=replace(s,signature,signature+'\n  if (!(await (await import("@/lib/launch-access")).canBrowseDirectory())) return [];',1)
  s=s.replace('eq(agencies.status, "active"),','eq(agencies.status, "active"), discoverableProfiles(),')
  return s
 edit(path,qedit)
# Price tools never expose a private profile as a supposedly anonymous statistic.
edit('lib/matching/index.ts',lambda s:'import { isRegistrationPhase } from "@/lib/launch-phase";\n'+s.replace('  if (city && countryOfCity(city) !== country) city = null;','  if (isRegistrationPhase()) return { agencies: 0, country, note: "Registration phase; market data is not published.", startingPrices: null, packagePrices: null, suggested: null };\n  if (city && countryOfCity(city) !== country) city = null;'))
def hire(s):
 s='import { discoverableProfiles } from "@/lib/data/publication";\nimport { isRegistrationPhase } from "@/lib/launch-phase";\n'+s
 s=s.replace('  const c = [eq(agencies.status, "active"),','  const c = [discoverableProfiles(), ...(isRegistrationPhase() ? [sql`false`] : []), eq(agencies.status, "active"),')
 s=s.replace('export async function serviceCounts({ realOnly = false } = {}) {','export async function serviceCounts({ realOnly = false } = {}) {\n  if (isRegistrationPhase()) return { services: new Map<string, number>(), pairs: new Map<string, number>(), countries: new Map<string, number>() };')
 s=s.replace('.where(realOnly ? and(eq(agencies.status, "active"), eq(agencies.isDemo, false)) : eq(agencies.status, "active"));','.where(and(discoverableProfiles(), realOnly ? and(eq(agencies.status, "active"), eq(agencies.isDemo, false)) : eq(agencies.status, "active")));')
 return s
edit('lib/data/hire.ts',hire)
edit('lib/monetization/promotions.ts',lambda s:'import { discoverableProfiles } from "@/lib/data/publication";\n'+s.replace('eq(agencies.status, "active"),','eq(agencies.status, "active"), discoverableProfiles(),'))

# Route checks precede metadata queries as well as rendering; DAL above remains authoritative.
for name in ['feed','explore','hire','hire/[service]','hire/[service]/[city]','match','who-runs','sawwiq50']:
 path=f'app/[locale]/(main)/{name}/page.tsx'
 if not (R/path).exists(): continue
 def gate(s):
  s='import { requireDirectory } from "@/lib/launch-access";\n'+s
  # Each exported async page/metadata resolves params before work. Every such occurrence is a gate.
  s,n=re.subn(r'(  const \{[^\n]+\} = await params;)',r'\1\n  await requireDirectory();',s)
  assert n>0,path
  return s
 edit(path,gate)
# Single profile links remain usable only according to publication choice.
for path in ['app/[locale]/(main)/a/[handle]/page.tsx','app/[locale]/(main)/a/[handle]/c/[client]/page.tsx']:
 def profile(s):
  s=s.replace('import { getAgencyByHandle } from "@/lib/data/agencies";','import { visibleAgencyByHandle, mayIndexAgency } from "@/lib/data/publication";')
  s=s.replace('getAgencyByHandle(', 'visibleAgencyByHandle(')
  s=s.replace('noindex: agency.isDemo || agency.status !== "active",','noindex: !(await mayIndexAgency(agency)),')
  s=s.replace('noindex: agency.isDemo,','noindex: !(await mayIndexAgency(agency)),')
  # Any source structured data must obey the same visibility permission.
  s=s.replace('{!agency.isDemo && (','{(await mayIndexAgency(agency)) && (')
  return s
 edit(path,profile)
# Indexed post metadata and JSON-LD must not publish draft or unlisted work.
edit('app/[locale]/(main)/p/[id]/page.tsx',lambda s:'import { publicationFor } from "@/lib/data/publication";\nimport { profileIndexable } from "@/lib/launch-phase";\n'+s.replace('noindex: post.agency.isDemo || !postIndexable(post.caption),','noindex: !profileIndexable((await publicationFor(post.agency.id)).visibility, post.agency.isDemo) || !postIndexable(post.caption),').replace('{!post.agency.isDemo && (','{profileIndexable((await publicationFor(post.agency.id)).visibility, post.agency.isDemo) && ('))
# Private targets cannot be probed or modified through public server actions.
def actions(s):
 s=s.replace('import { canUse }', 'import { mayReadAgencyId } from "@/lib/data/publication";\nimport { getPost } from "@/lib/data/posts";\nimport { canUse }',1)
 for fn in ['likePost','savePost']:
  s=s.replace(f'export async function {fn}(postId: string) {{',f'export async function {fn}(postId: string) {{\n  if (!(await getPost(uuid.parse(postId)))) throw new Error("not_found");')
 s=s.replace('export async function followAgency(agencyId: string) {','export async function followAgency(agencyId: string) {\n  if (!(await mayReadAgencyId(uuid.parse(agencyId)))) throw new Error("not_found");')
 s=s.replace('  const visitorId = await getVisitorId({ create: true });\n  if (visitorId && !rateLimit(`contact:', '  if (!(await mayReadAgencyId(uuid.parse(agencyId)))) return;\n  const visitorId = await getVisitorId({ create: true });\n  if (visitorId && !rateLimit(`contact:',1)
 s=s.replace('if (!agency || agency.status !== "active") return { error: "generic" };','if (!agency || agency.status !== "active" || !(await mayReadAgencyId(agency.id))) return { error: "generic" };')
 return s
edit('app/[locale]/(main)/actions.ts',actions)

# No lists, counts, hidden URLs or private portfolio content in search feeds.
edit('app/sitemap.ts',lambda s:'import { isRegistrationPhase } from "@/lib/launch-phase";\nimport { discoverableProfiles } from "@/lib/data/publication";\n'+s.replace('  if (!siteIndexable()) return [];','  if (!siteIndexable()) return [];\n  if (isRegistrationPhase()) return ["", "/soon", "/contact", "/join", "/start", "/legal"].flatMap((p) => entries(p));').replace('const real = and(eq(agencies.status, "active"), eq(agencies.isDemo, false));','const real = and(eq(agencies.status, "active"), eq(agencies.isDemo, false), discoverableProfiles());'))
edit('app/llms.txt/route.ts',lambda s:'import { isRegistrationPhase } from "@/lib/launch-phase";\nimport { discoverableProfiles } from "@/lib/data/publication";\nimport messages from "@/messages/en.json";\n'+s.replace('  const db = await getDb();','  if (isRegistrationPhase()) return new Response(messages.Registration.llms, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });\n  const db = await getDb();',1).replace('eq(agencies.status, "active"), eq(agencies.isDemo, false)','eq(agencies.status, "active"), eq(agencies.isDemo, false), discoverableProfiles()'))
edit('lib/indexnow.ts',lambda s:'import { isRegistrationPhase } from "@/lib/launch-phase";\n'+s.replace('export function pingIndexNow(', 'export function pingIndexNow(').replace('  const key = process.env.INDEXNOW_KEY;', '  if (isRegistrationPhase()) return;\n  // Discovery of profile changes is handled by the permission-filtered sitemap.\n  paths = paths.filter((p) => !/\\/(?:a|p)\\//.test(p));\n  const key = process.env.INDEXNOW_KEY;'))
