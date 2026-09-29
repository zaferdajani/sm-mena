from pathlib import Path
import json
R=Path.cwd()
def edit(path,a,b):
 p=R/path;s=p.read_text();assert a in s,(path,a[:100]);p.write_text(s.replace(a,b,1))
edit('tests/unit/registration-phase.test.ts','title: "Existing client project", summary:', 'specialRequests: "", title: "Existing client project", summary:')
# The discovery policy is enforced at the data boundary, even for pilot UI routes.
edit('lib/data/collab-discovery.ts','import "server-only";', 'import "server-only";\nimport { discoverableProfiles } from "@/lib/data/publication";\nimport { isRegistrationPhase } from "@/lib/launch-phase";')
edit('lib/data/collab-discovery.ts','  const roles = q.roles.filter', '  if (isRegistrationPhase() && !(await (await import("@/lib/launch-access")).canBrowseDirectory())) return { items: [] as DiscoverCard[], next: null as number | null, total: 0, truncated: false };\n  const roles = q.roles.filter')
edit('lib/data/collab-discovery.ts','const conditions = [eq(agencies.status, "active"),','const conditions = [discoverableProfiles(), eq(agencies.status, "active"),')
# Reports must not create interactions against a guessed private post ID.
edit('app/[locale]/(main)/actions.ts','  if (!rateLimit(`report:${visitorId}`', '  if (!(await getPost(parsed.data.postId))) return { error: "generic" };\n  if (!rateLimit(`report:${visitorId}`')
# Keep the freshly merged creator guide reachable from the registration workspace.
edit('components/registration/studio-shell.tsx','import { StudioNav }', 'import { CreatorSetupNudge } from "@/components/studio/creator-guide";\nimport { StudioNav }')
edit('components/registration/studio-shell.tsx','const [t, s, a] = await Promise.all([getTranslations("Registration"), getTranslations("Studio"), getTranslations("Auth")]);','const [t, s, a, g] = await Promise.all([getTranslations("Registration"), getTranslations("Studio"), getTranslations("Auth"), getTranslations("CreatorSetup")]);')
edit('components/registration/studio-shell.tsx','{ href: "/studio", label: s("overview") },','{ href: "/studio", label: s("overview") }, { href: "/studio/setup", label: g("nav") },')
edit('components/registration/studio-shell.tsx','<div className="sw-workspace-body px-4 py-5">{children}</div>', '<div className="sw-workspace-body px-4 py-5"><CreatorSetupNudge hasWork={agency.postCount > 0} />{children}</div>')
# Drizzle schema, generated snapshot and SQL must describe the same table.
p=R/'lib/db/schema.ts';s=p.read_text();needle='check("profile_publications_visibility_check", sql`${t.visibility} in (\'private\', \'unlisted\', \'public\')`)]);';assert needle in s;s=s.replace(needle,needle[:-2]+'.enableRLS();');p.write_text(s)
p=R/'lib/db/migrations/meta/0028_snapshot.json';j=json.loads(p.read_text());j['tables']['public.profile_publications']['isRLSEnabled']=True;p.write_text(json.dumps(j,indent=2)+'\n')
p=R/'lib/db/migrations/0028_profile_publication.sql';p.write_text('''CREATE TABLE IF NOT EXISTS "profile_publications" (
  "agency_id" uuid PRIMARY KEY NOT NULL,
  "visibility" text DEFAULT 'private' NOT NULL,
  "consent_version" text NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "profile_publications_visibility_check" CHECK ("visibility" IN ('private', 'unlisted', 'public')),
  CONSTRAINT "profile_publications_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_publications_visibility_idx" ON "profile_publications" ("visibility");
--> statement-breakpoint
ALTER TABLE "profile_publications" ENABLE ROW LEVEL SECURITY;
''')
# A deliberate private profile is a valid state, not a promise that Publish is public.
for lang in ['ar','en']:
 p=R/f'messages/{lang}.json';j=json.loads(p.read_text())
 j['Registration']['studio']['publishNote']=('إضافة العمل تحفظه في صفحتك حسب خيار الخصوصية الذي حددته. الصفحة الخاصة تبقى خاصة، ولا تظهر في دليل المزوّدين تلقائياً.' if lang=='ar' else 'Adding work saves it to your page under your chosen visibility. A private page stays private; adding a project never enrolls it in the public directory.')
 p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n')
edit('app/[locale]/(main)/studio/new/page.tsx','import { FileUp, Palette }','import { isRegistrationPhase } from "@/lib/launch-phase";\nimport { FileUp, Palette }')
edit('app/[locale]/(main)/studio/new/page.tsx','  const tg = await getTranslations("CreatorSetup");','  const tg = await getTranslations("CreatorSetup");\n  const phaseCopy = await getTranslations("Registration");')
edit('app/[locale]/(main)/studio/new/page.tsx','<p className="mt-4 text-sm leading-7 text-muted-foreground">{tg("publishReminder")}</p>','<p className="mt-4 text-sm leading-7 text-muted-foreground">{isRegistrationPhase() ? phaseCopy("studio.publishNote") : tg("publishReminder")}</p>')
# Independent regression proving the collaborator directory cannot expose a private page.
p=R/'tests/unit/registration-phase.test.ts';s=p.read_text();s=s.replace('import sharp from "sharp";','import sharp from "sharp";\nimport { discoverCollaborators } from "@/lib/data/collab-discovery";');pos=s.index('  it("keeps already published legacy links')
s=s[:pos]+'''  it("excludes private and unlisted collaborators, including pilot discovery", async () => {
    vi.stubEnv("LAUNCH_PHASE", "registration");
    const target = await account("hidden.collaborator");
    vi.stubEnv("LAUNCH_PHASE", "full");
    const buyer = await account("searching.collaborator");
    expect((await discoverCollaborators(buyer.agency, { roles: [] })).items.map((v) => v.card.id)).not.toContain(target.agency.id);
    await setPublication(target.user.id, target.agency.id, "unlisted");
    expect((await discoverCollaborators(buyer.agency, { roles: [] })).items.map((v) => v.card.id)).not.toContain(target.agency.id);
    vi.stubEnv("LAUNCH_PHASE", "registration"); actor.pilot = true;
    await setPublication(target.user.id, target.agency.id, "private");
    expect((await discoverCollaborators(buyer.agency, { roles: [] })).items.map((v) => v.card.id)).not.toContain(target.agency.id);
  });
''' +s[pos:];p.write_text(s)
