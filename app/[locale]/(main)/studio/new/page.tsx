import { FileUp, Palette } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { canUse } from "@/lib/feature-gate";
import { PostForm } from "@/components/studio/post-form";
import { PortfolioComposerGuide } from "@/components/studio/creator-guide";
import { requireAgency } from "@/lib/auth/guards";
import { contentLang } from "@/lib/content-lang";
import { postFormOptions } from "@/lib/studio-options";

export default async function NewPostPage({ params }: PageProps<"/[locale]/studio/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Studio");
  const ti = await getTranslations("PortfolioImport");
  const tb = await getTranslations("BehanceImport");
  const tg = await getTranslations("CreatorSetup");
  const outline = await getTranslations({ locale: contentLang(agency.contentLang), namespace: "CreatorSetup" });
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-lg font-bold">{t("newPost")}</h1>
      <PortfolioComposerGuide descriptionOutline={outline("structure")} />
      {(await canUse("portfolio_import")) && (
        <div className="mb-5 grid gap-2">
          <Link href="/studio/import/behance" className="flex items-center gap-3 rounded-xl border border-brand-line bg-brand-soft p-3 text-sm hover:bg-accent" data-testid="behance-import-link">
            <Palette className="size-5 shrink-0 text-brand" />
            <span><b className="block">{tb("linkTitle")}</b><span className="text-muted-foreground">{tb("linkBody")}</span></span>
          </Link>
          <Link href="/studio/import" className="flex items-center gap-3 rounded-xl border p-3 text-sm hover:bg-accent" data-testid="import-link">
            <FileUp className="size-5 shrink-0 text-brand" />
            <span><b className="block">{ti("linkTitle")}</b><span className="text-muted-foreground">{ti("linkBody")}</span></span>
          </Link>
        </div>
      )}
      <PostForm mode="create" contentLang={contentLang(agency.contentLang)} {...await postFormOptions(agency.services, agency.id)} />
      <p className="mt-4 text-sm leading-7 text-muted-foreground">{tg("publishReminder")}</p>
    </div>
  );
}
