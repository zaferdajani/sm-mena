import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgencyAvatar } from "@/components/agency-avatar";
import { ReviewForm } from "@/components/reviews/review-form";
import { resolveInvite } from "@/lib/data/reviews";
import { mediaUrl } from "@/lib/storage";
import { featureGate } from "@/lib/feature-gate";
import { ComingSoon } from "@/components/features/coming-soon";
import { notFound } from "next/navigation";

export const metadata: Metadata = { robots: { index: false } };

export default async function InviteReviewPage({ params }: PageProps<"/[locale]/review/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const gate = await featureGate("reviews");
  if (gate === "off") notFound();
  if (gate === "soon") return <ComingSoon feature="reviews" />;
  const t = await getTranslations("Reviews.form");
  const invite = await resolveInvite(token);
  if (!invite) {
    return <p className="mx-auto max-w-md px-4 py-20 text-center text-muted-foreground" data-testid="review-invalid">{t("invalid")}</p>;
  }
  const { agency } = invite;
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <AgencyAvatar name={agency.name} src={mediaUrl(agency.avatarKey)} size={56} ring />
        <div>
          <h1 className="text-lg font-bold">{t("title", { name: agency.name })}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <ReviewForm mode="invite" token={token} services={agency.services} />
    </div>
  );
}
