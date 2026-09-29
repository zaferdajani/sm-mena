from pathlib import Path
p=Path('components/setup/wizard.tsx');p.write_text(p.read_text().replace('beforeLeave','beforeLeaveRef'))
p=Path('tests/unit/onboarding-hardening.test.ts');s=p.read_text();pos=s.index('let png: Buffer;');s=s[:pos]+'''// Optional concurrency rehearsal uses a disposable local Postgres service only.
// It cannot select a production database, even when the surrounding shell has secrets.
if (process.env.ONBOARDING_REHEARSAL_URL) {
  const target = new URL(process.env.ONBOARDING_REHEARSAL_URL);
  if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.pathname !== "/sawwiq_rehearsal" || target.username !== "qa_rehearsal") {
    throw new Error("Rehearsal database must be the isolated local QA service");
  }
  process.env.DATABASE_URL = target.toString();
}

'''+s[pos:];p.write_text(s)
