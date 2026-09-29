"""One-off guarded source patch. No database, users, feature flags or credentials."""
from pathlib import Path
import json
root = Path.cwd()
changes = {}
def edit(name, replacements):
    source = (root / name).read_text()
    for before, after, count in replacements:
        assert source.count(before) == count, (name, before, source.count(before), count)
        source = source.replace(before, after)
    changes[name] = source
edit('components/studio/team-fields.tsx', [
 ('import { ChipGroup } from "./chips";', 'import { RolePicker } from "./role-picker";\nimport { normalizeRoleSelection } from "@/lib/services/role-input";', 1),
 ('roles, teamRoles, seeksRoles, compact = false', 'roles, teamRoles: initialTeamRoles, seeksRoles: initialSeeksRoles, compact = false', 1),
 ('  const [kind, setKind] = useState(initialKind);', '  const [kind, setKind] = useState(initialKind);\n  const [teamRoles, setTeamRoles] = useState(() => normalizeRoleSelection(initialTeamRoles));\n  const [seeksRoles, setSeeksRoles] = useState(() => normalizeRoleSelection(initialSeeksRoles));', 1),
 ('<ChipGroup name="teamRoles" options={roles} defaultValues={teamRoles} />', '<RolePicker name="teamRoles" options={roles} values={teamRoles} onChange={setTeamRoles} />', 2),
 ('<ChipGroup name="seeksRoles" options={roles} defaultValues={seeksRoles} />', '<RolePicker name="seeksRoles" options={roles} values={seeksRoles} onChange={setSeeksRoles} />', 1),
])
edit('lib/services/catalog.ts', [
 ('import catalog from "@/data/service-catalog.json";', 'import catalog from "@/data/service-catalog.json";\nimport { roleInputLabel } from "./role-input";', 1),
 ('  const r = ROLES.find((x) => x.key === key);\n  return r ? (locale === "ar" ? r.name_ar : r.name_en) : key;', '  return roleInputLabel(key, locale);', 1),
])
edit('app/[locale]/(auth)/actions.ts', [
 ('import { JOIN_ROLES, ROLE_KEYS } from "@/lib/services/catalog";', 'import { JOIN_ROLES } from "@/lib/services/catalog";\nimport { normalizeRoleSelection } from "@/lib/services/role-input";', 1),
 ('all("teamRoles").filter((r) => ROLE_KEYS.includes(r))', 'normalizeRoleSelection(all("teamRoles"))', 1),
])
edit('app/[locale]/(main)/studio/actions.ts', [
 ('import { ROLE_KEYS } from "@/lib/services/catalog";', 'import { normalizeRoleSelection } from "@/lib/services/role-input";', 1),
 ('list(formData, "teamRoles").filter((r) => ROLE_KEYS.includes(r))', 'normalizeRoleSelection(list(formData, "teamRoles"))', 1),
 ('list(formData, "seeksRoles").filter((r) => ROLE_KEYS.includes(r))', 'normalizeRoleSelection(list(formData, "seeksRoles"))', 1),
])
name = 'data/service-catalog.json'
catalog = json.loads((root / name).read_text())
seo = next(r for r in catalog['roles'] if r['key'] == 'seo_specialist')
assert seo['name_ar'] == 'مختص سيو'
seo['name_ar'] = 'مختص SEO'
seo_labels = {'seo':'SEO','arabic_seo':'SEO العربي','technical_seo':'SEO التقني وسرعة الموقع','local_seo':'SEO المحلي','seo_content_writing':'كتابة مقالات SEO والمدونات','seo_audit':'تدقيق SEO وتحليل الكلمات المفتاحية'}
replacements = [('("seo_specialist", "مختص سيو", "SEO specialist")','("seo_specialist", "مختص SEO", "SEO specialist")',1)]
for item in catalog['services']:
    if item['key'] in seo_labels:
        before = item['name_ar']; after = seo_labels[item['key']]
        assert before != after, item['key']
        item['name_ar'] = after
        replacements.append((f'"{before}"', f'"{after}"', 1))
changes[name] = json.dumps(catalog,ensure_ascii=False,indent=2)+'\n'
edit('scripts/gen-service-catalog.py',replacements)
role_copy = {
 'ar': {'label':'أضف تخصصاً آخر','placeholder':'اكتب التخصص… مثلاً SEO أو مصمم ثلاثي الأبعاد','hint':'ابحث أولاً عن التخصص الموجود. لو تخصصك مختلف، تقدر تضيفه باسم جديد.','matches':'هل تقصد أحد هذه التخصصات؟','already':'مضاف بالفعل','add':'أضف','distinct':'تخصصي مختلف عن هذه الاقتراحات','customHint':'سيُحفظ هذا المسمى في صفحتك، ولن يُضاف تلقائياً إلى قائمة التخصصات العامة.','invalid':'اكتب مسمى واضحاً من حرفين إلى 64 حرفاً، بدون روابط أو رموز خاصة.','limit':'يمكنك اختيار 40 تخصصاً كحد أقصى.','selected':'تمت إضافة التخصص.','removed':'تم إلغاء الاختيار.'},
 'en': {'label':'Add another role','placeholder':'Type a role… e.g. SEO or 3D artist','hint':'Check existing roles first. Add a new title when your specialty is different.','matches':'Does one of these roles match?','already':'Already added','add':'Add','distinct':'My specialty is different from these suggestions','customHint':'This title is saved on your profile, not automatically added to the shared role catalog.','invalid':'Use a clear title of 2–64 characters, without links or special symbols.','limit':'You can select up to 40 roles.','selected':'Role added.','removed':'Selection removed.'},
}
for locale,texts in role_copy.items():
    name=f'messages/{locale}.json';messages=json.loads((root/name).read_text())
    assert 'RolePicker' not in messages,'RolePicker namespace changed; review instead of overwrite'
    messages['RolePicker']=texts;changes[name]=json.dumps(messages,ensure_ascii=False,indent=2)+'\n'
for name,source in changes.items(): (root/name).write_text(source)
print('Patched:', ', '.join(changes))
