from pathlib import Path
p=Path('tests/unit/onboarding-hardening.test.ts');s=p.read_text().replace('width: 160, height: 120','width: 320, height: 240').replace('  await addSetupMedia(me.agency.id, [png], "upload");','  const uploaded = await addSetupMedia(me.agency.id, [png], "upload");\n  if ("error" in uploaded) throw new Error(`Invalid test setup: ${uploaded.error}`);');p.write_text(s)
