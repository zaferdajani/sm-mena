import { FileUp } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { canUse } from "@/lib/feature-gate";
import { PostForm } from "@/components/studio/post-form";
import { requireAgency } from "@/lib/auth/guards";
import { postFormOptions } from "@/lib/studio-options";

export default async function NewPostPage({ params }: PageProps<"/[locale]/studio/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Studio");
  const ti = await getTranslations("PortfolioImport");
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-lg font-bold">{t("newPost")}</h1>
      {(await canUse("portfolio_import")) && (
        <Link href="/studio/import" className="mb-5 flex items-center gap-3 rounded-xl border border-brand-line bg-brand-soft p-3 text-sm hover:bg-accent" data-testid="import-link">
          <FileUp className="size-5 shrink-0 text-brand" />
          <span>
            <b className="block">{ti("linkTitle")}</b>
            <span className="text-muted-foreground">{ti("linkBody")}</span>
          </span>
        </Link>
      )}
      <PostForm mode="create" {...await postFormOptions(agency.services, agency.id)} />
    </div>
  );
}
