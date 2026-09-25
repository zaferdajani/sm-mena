import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { FundCheckout } from "@/components/contracts/fund-checkout";
import { requireAgency } from "@/lib/auth/guards";
import { getContractForClientAgency, nextFundable } from "@/lib/data/contracts";

// Partner contracts: the buying agency pays a milestone into protection (test-mode contracts only).
export default async function FundPartnerMilestone({ params }: PageProps<"/[locale]/studio/contracts/[id]/fund/[milestoneId]">) {
  const { locale, id, milestoneId } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const v = await getContractForClientAgency(agency.id, id);
  const m = v && nextFundable(v);
  if (!v || !m || m.id !== milestoneId || v.contract.paymentsLive) notFound();
  return <FundCheckout v={v} milestoneId={m.id} hidden={{ contractId: v.contract.id, as: "buyer" }} back={`/studio/contracts/${v.contract.id}`} locale={locale} />;
}
