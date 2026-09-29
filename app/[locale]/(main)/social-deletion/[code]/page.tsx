import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDeletionRequest } from "@/lib/data/social";

// Status of a Meta data-deletion request (docs/53): the confirmation code Meta
// showed the person leads here. It says what was removed, never who.
export default async function SocialDeletionPage({ params }: PageProps<"/[locale]/social-deletion/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const request = await getDeletionRequest(code);
  if (!request) notFound();
  const t = await getTranslations("Social");
  return (
    <div className="mx-auto max-w-xl space-y-3 px-4 py-8">
      <h1 className="text-lg font-bold">{t("deletion.title")}</h1>
      <p className="text-sm leading-7">{t("deletion.body", { provider: t(`provider.${request.provider}`), code: request.code })}</p>
    </div>
  );
}
