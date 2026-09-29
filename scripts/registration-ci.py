from pathlib import Path
R=Path.cwd()
p=R/'lib/storage/index.ts';s=p.read_text().replace('const { error: missing } = await client.storage.getBucket(name);','const { data: existingBucket, error: missing } = await client.storage.getBucket(name);\n      if (!isPublic && existingBucket?.public === true) throw new Error("Private media bucket is configured as public; refusing upload.");');p.write_text(s)
p=R/'tests/unit/registration-phase.test.ts';s=p.read_text().replace('retained.contract.termsHash','retained.contract.termsHash').replace('original.contract.termsHash','original.contract.termsHash');p.write_text(s)
p=R/'.github/workflows/ci.yml';s=p.read_text();s=s.replace('branches: [main]','branches: [main, feat/registration-phase]');s+='''
  registration:
    name: Registration-phase privacy and browser tests
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
        env:
          LAUNCH_PHASE: registration
      - run: npx playwright test -c playwright.registration.config.ts
        env:
          CI: "true"
      - name: Filter registration screenshots and metadata
        if: always()
        run: |
          if [ -d registration-report ]; then
            cp -R registration-report playwright-report
            python3 scripts/collect-design-evidence.py
          fi
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: registration-evidence
          path: design-evidence/
          retention-days: 7
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: registration-report
          path: registration-report/
          retention-days: 7
''';p.write_text(s)
# No target-profile metadata can bypass the publication check.
s=(R/'app/[locale]/(main)/a/[handle]/page.tsx').read_text()
assert 'visibleAgencyByHandle(handle)' in s and 'noindex: !(await mayIndexAgency(agency))' in s
assert 'getAgencyByHandle' not in s
assert 'registrationMode={isRegistrationPhase()}' in s
assert 'profilePublications' in (R/'lib/data/agencies.ts').read_text()
assert 'launchPhase: launchPhase()' in (R/'app/api/version/route.ts').read_text()
assert 'if (!documentsOpen()) return { error: "unavailable" };' in (R/'lib/data/contracts.ts').read_text()
