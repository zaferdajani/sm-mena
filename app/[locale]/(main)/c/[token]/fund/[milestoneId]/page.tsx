import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { FundCheckout } from "@/components/contracts/fund-checkout";
import { getContractByToken, nextFundable } from "@/lib/data/contracts";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

// Built-in test checkout for paying a milestone into protection (test-mode contracts only).
export default async function FundMilestone({ params, searchParams }: PageProps<"/[locale]/c/[token]/fund/[milestoneId]">) {
  const { locale, token, milestoneId } = await params;
  setRequestLocale(locale);
  const v = await getContractByToken(token);
  const m = v && nextFundable(v);
  if (!v || !m || m.id !== milestoneId || v.contract.paymentsLive) notFound();
  const card = (await searchParams).card;
  return <FundCheckout v={v} milestoneId={m.id} hidden={{ token }} back={`/c/${token}`} locale={locale} cardError={typeof card === "string" ? card : null} />;
}
