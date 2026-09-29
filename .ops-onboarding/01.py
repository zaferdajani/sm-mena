from pathlib import Path
root=Path('.')
p=root/'lib/data/portfolio-setup.ts';s=p.read_text().replace('const staged = [];','const staged: { id: string; agencyId: string; key: string; width: number; height: number; source: "upload" | "pdf" }[] = [];')
s=s.replace('if (!buf) return { error: "media" };','''if (!buf) {
          // A simultaneous successful publication removes its staged bytes.
          // Return that committed result rather than reporting a false upload error.
          const latest = await row(input.agencyId);
          return latest?.postId ? { postId: latest.postId } : { error: "media" };
        }''');p.write_text(s)
p=root/'app/[locale]/(main)/portfolio-setup/actions.ts';s=p.read_text();pos=s.index('export async function uploadSetupMediaAction')
s=s[:pos]+'''/** Preserve incomplete project text on Back/Finish later without publishing it.
 * Final Preview/Publish still enforce the complete project requirements.
 */
export async function saveProjectDraftAction(v: number, input: unknown, destination: "back" | "pause"): Promise<SetupResult> {
  const { agency } = await requireAgency();
  const parsed = projectSchema.extend({ title: z.string().max(120), contribution: z.string().max(600), services: z.array(z.string().max(60)).max(6) })
    .safeParse({ ...(input && typeof input === "object" ? input : {}), version: v });
  if (!parsed.success || !["back", "pause"].includes(destination)) return { error: "invalid" };
  const current = await getSetup(agency.id);
  if (!current || current.step !== 4 || current.version !== parsed.data.version) return { error: "stale" };
  const value = parsed.data;
  const behance = current.data.behance && value.behanceImages
    ? { ...current.data.behance, images: current.data.behance.images.filter((url) => value.behanceImages!.includes(url)) }
    : current.data.behance;
  return done(await writeSetup(agency.id, value.version, {
    step: destination === "back" ? 3 : 4, status: destination === "pause" ? "paused" : "in_progress",
    data: { project: { title: value.title, contribution: value.contribution, services: [...new Set(value.services)].filter(isServiceKey) }, ...(behance ? { behance } : {}) },
  }));
}

'''+s[pos:];p.write_text(s)
p=root/'components/setup/wizard.tsx';s=p.read_text().replace('  saveProjectStepAction,','  saveProjectStepAction,\n  saveProjectDraftAction,')
s=s.replace('  const heading = useRef<HTMLHeadingElement>(null);','  const heading = useRef<HTMLHeadingElement>(null);\n  const beforeLeave = useRef<((destination: "back" | "pause") => Promise<SetupResult>) | null>(null);')
s=s.replace('const back = () => run(() => goToStepAction(view.version, Math.max(1, view.step - 1)));','const back = () => run(() => beforeLeave.current ? beforeLeave.current("back") : goToStepAction(view.version, Math.max(1, view.step - 1)));')
s=s.replace('const finishLater = () => run(() => pauseSetupAction(view.version), () => router.push("/studio"));','const finishLater = () => run(() => beforeLeave.current ? beforeLeave.current("pause") : pauseSetupAction(view.version), () => router.push("/studio"));')
s=s.replace('setError={setError} />','setError={setError} beforeLeave={beforeLeave} />')
s=s.replace('back, setError }: StepProps & {','back, setError, beforeLeave }: StepProps & {')
s=s.replace('  setError: (e: string | null) => void;','  setError: (e: string | null) => void;\n  beforeLeave: React.RefObject<((destination: "back" | "pause") => Promise<SetupResult>) | null>;')
pos=s.index('  // Unsaved files: warn')
s=s[:pos]+'''  useEffect(() => {
    const save = async (destination: "back" | "pause"): Promise<SetupResult> => {
      if (uploading || busy) return { error: "generic" };
      return saveProjectDraftAction(view.version, { title, contribution, services, ...(isBehance ? { behanceImages } : {}) }, destination);
    };
    beforeLeave.current = save;
    return () => { if (beforeLeave.current === save) beforeLeave.current = null; };
  }, [view.version, title, contribution, services, behanceImages, isBehance, uploading, busy, beforeLeave]);
'''+s[pos:];p.write_text(s)
p=root/'tests/e2e/portfolio-setup.spec.ts';s=p.read_text();s+='''

test("Back and Finish later keep incomplete project text without publishing", async ({ page }) => {
  await joinAgency(page, "wizsave", { stay: true });
  await page.getByTestId("setup-profile-skip").click();
  await page.getByTestId("source-upload").click();
  await page.getByTestId("client-mode-private").check();
  await page.getByTestId("setup-client-next").click();
  await page.getByTestId("setup-project-title").fill("Unfinished title");
  // A one-character contribution is intentionally below publication validation.
  await page.getByTestId("setup-project-contribution").fill("A");
  await page.getByTestId("setup-back").click();
  await expect(page.getByTestId("setup-wizard")).toHaveAttribute("data-step", "3");
  await page.getByTestId("setup-client-next").click();
  await expect(page.getByTestId("setup-project-title")).toHaveValue("Unfinished title");
  await page.getByTestId("setup-project-contribution").fill("Still drafting");
  await page.getByTestId("setup-later").click();
  await expect(page).toHaveURL(/\\/en\\/studio$/);
  await page.getByTestId("creator-setup-start").click();
  await expect(page.getByTestId("setup-wizard")).toHaveAttribute("data-step", "4");
  await expect(page.getByTestId("setup-project-title")).toHaveValue("Unfinished title");
  await expect(page.getByTestId("setup-project-contribution")).toHaveValue("Still drafting");
  await expect(page.getByTestId("setup-media").locator("li")).toHaveCount(0);
});
''';p.write_text(s)
