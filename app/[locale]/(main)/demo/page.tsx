import { Search, Store } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { enterDemoAction } from "@/app/[locale]/(main)/demo-actions";
import { agencyName } from "@/lib/content-lang";
import { getAgencyByHandle } from "@/lib/data/agencies";
import { DEMO_STUDIO_HANDLES } from "@/lib/demo-mode";
import { canUse } from "@/lib/feature-gate";
import { pageMeta } from "@/lib/seo";

// Reached only by typing /demo: not linked, not indexed, not in the sitemap.
export async function generateMetadata({ params }: PageProps<"/[locale]/demo">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Demo" });
  return pageMeta({ locale, path: "/demo", title: t("title"), description: t("intro"), noindex: true });
}

export default async function DemoPage({ params }: PageProps<"/[locale]/demo">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Demo");
  // The demo view can be switched off (Admin → Features → demo view).
  const open = await canUse("demo_view");
  const studios = open ? (await Promise.all(DEMO_STUDIO_HANDLES.map((h) => getAgencyByHandle(h)))).filter((a) => a?.isDemo) : [];
  const card = "flex w-full items-start gap-3 rounded-xl border p-4 text-start hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 outline-none";
  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-8" data-testid="demo-page">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>
      {!open && <p className="rounded-xl border p-4 text-sm" data-testid="demo-off">{t("off")}</p>}
      <ul className="grid gap-3" hidden={!open}>
        <li>
          <form action={enterDemoAction}>
            <button type="submit" className={card} data-testid="demo-as-client">
              <Search className="mt-0.5 size-5 shrink-0 text-brand" />
              <span>
                <b className="block">{t("asClient.title")}</b>
                <span className="text-sm text-muted-foreground">{t("asClient.body")}</span>
              </span>
            </button>
          </form>
        </li>
        {studios.map((a) => (
          <li key={a!.handle}>
            <form action={enterDemoAction}>
              <input type="hidden" name="as" value={a!.handle} />
              <button type="submit" className={card} data-testid={`demo-as-${a!.handle}`}>
                <Store className="mt-0.5 size-5 shrink-0 text-brand" />
                <span>
                  <b className="block">{t("asAgency.title", { name: agencyName({ name: a!.name, nameTranslation: a!.translation?.name ?? null, contentLang: a!.contentLang }, locale) })}</b>
                  <span className="text-sm text-muted-foreground">{t("asAgency.body")}</span>
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
      <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">{t("note")}</p>
    </article>
  );
}
