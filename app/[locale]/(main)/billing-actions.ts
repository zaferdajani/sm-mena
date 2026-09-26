"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { applyProviderEvent, getPayment, PLAN_MONTHS, startPlanCheckout } from "@/lib/data/payments";
import { monetizationEnabled } from "@/lib/monetization/plans";
import { isTestPayments, paymentProvider, type ProviderEvent } from "@/lib/payments/provider";
import { rateLimit } from "@/lib/rate-limit";

export async function checkoutPlanAction(formData: FormData) {
  const { user, agency } = await requireAgency();
  const locale = await getLocale();
  const data = z
    .object({ plan: z.enum(["pro", "business"]), months: z.coerce.number().refine((m) => (PLAN_MONTHS as readonly number[]).includes(m)) })
    .parse(Object.fromEntries(formData));
  // Checkout is open once revenue is switched on; the test provider also allows it for trying the flow.
  // Demo agencies (lib/demo.ts) never pay.
  if (agency.isDemo || (!monetizationEnabled() && !isTestPayments())) return redirect({ href: "/studio/billing", locale });
  if (!rateLimit(`checkout:${agency.id}`, 10, 60 * 60 * 1000)) return redirect({ href: "/studio/billing?error=rate", locale });
  const { redirectPath } = await startPlanCheckout(agency.id, data.plan, data.months, user.id);
  return redirect({ href: redirectPath, locale });
}

/**
 * The built-in test checkout: behaves like a gateway calling our webhook, so
 * the same verified path (idempotent event, amount check, activation) runs.
 */
export async function mockPayAction(formData: FormData) {
  const { agency } = await requireAgency();
  const locale = await getLocale();
  if (!isTestPayments()) return redirect({ href: "/studio/billing", locale });
  const id = z.string().uuid().parse(formData.get("id"));
  const outcome = formData.get("outcome") === "fail" ? "payment.failed" : "payment.succeeded";
  const payment = await getPayment(id);
  if (!payment || payment.agencyId !== agency.id) return redirect({ href: "/studio/billing", locale });
  const event: ProviderEvent = { id: `evt_${crypto.randomUUID()}`, type: outcome, paymentRef: payment.id, providerRef: payment.providerRef ?? `mock_${payment.id.slice(0, 8)}`, amountFils: payment.amountFils };
  await applyProviderEvent(paymentProvider().id, event);
  return redirect({ href: `/studio/billing?paid=${outcome === "payment.succeeded" ? 1 : 0}`, locale });
}
