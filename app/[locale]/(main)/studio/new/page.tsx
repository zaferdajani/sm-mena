import { getTranslations, setRequestLocale } from "next-intl/server";
import { PostForm } from "@/components/studio/post-form";
import { requireAgency } from "@/lib/auth/guards";
import { contentLang } from "@/lib/content-lang";
import { postFormOptions } from "@/lib/studio-options";

export default async function NewPostPage({ params }: PageProps<"/[locale]/studio/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Studio");
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-lg font-bold">{t("newPost")}</h1>
      <PostForm mode="create" contentLang={contentLang(agency.contentLang)} {...await postFormOptions(agency.services, agency.id)} />
    </div>
  );
}
