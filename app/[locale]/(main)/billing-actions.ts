"use server";

import { featureOpen } from "@/lib/features";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { applyProviderEvent, getPayment, PLAN_MONTHS, startPlanCheckout } from "@/lib/data/payments";
import { isTestPayments, paymentProvider, type ProviderEvent } from "@/lib/payments/provider";
import { rateLimit } from "@/lib/rate-limit";

export async function checkoutPlanAction(formData: FormData) {
  const { user, agency } = await requireAgency();
  const locale = await getLocale();
  const data = z
    .object({ plan: z.enum(["pro", "business"]), months: z.coerce.number().refine((m) => (PLAN_MONTHS as readonly number[]).includes(m)) })
    .parse(Object.fromEntries(formData));
  // Checkout follows Admin → Features → "Paid plans" (on, or this agency is a pilot).
  if (!(await featureOpen("paid_plans", { agencyHandle: agency.handle }))) return redirect({ href: "/studio/billing", locale });
  if (!rateLimit(`checkout:${agency.id}`, 10, 60 * 60 * 1000)) return redirect({ href: "/studio/billing?error=rate", locale });
  const { redirectPath } = await startPlanCheckout(agency.id, data.plan, data.months, user.id);
  return redirect({ href: redirectPath, locale });
}

/**
 * The built-in test checkout: behaves like a gateway calling our webhook, so
 * the same verified path (idempotent event, amount check, activation) runs.
 */
/** Staging sandbox for plan checkout. The one-click test button stays for every other deployment. */
export async function virtualPlanPayAction(formData: FormData) {
  const { agency, user } = await requireAgency();
  const locale = await getLocale();
  const { virtualCheckoutEnabled, debitVirtualWallet, recordVirtualDecline, creditVirtualWallet } = await import("@/lib/payments/virtual-wallet");
  const { evaluateTestCard } = await import("@/lib/payments/virtual-cards");
  if (!virtualCheckoutEnabled()) return redirect({ href: "/studio/billing", locale });
  const id = z.string().uuid().parse(formData.get("id"));
  const payment = await getPayment(id);
  if (!payment || payment.agencyId !== agency.id || payment.status !== "pending") return redirect({ href: "/studio/billing", locale });
  const outcome = evaluateTestCard({
    number: String(formData.get("card") ?? ""),
    expiry: String(formData.get("expiry") ?? ""),
    cvc: String(formData.get("cvc") ?? ""),
    name: String(formData.get("holder") ?? ""),
  });
  const back = `/pay/${payment.id}`;
  if (outcome !== "success") {
    await recordVirtualDecline(user.email, payment.amountFils, "JOD", `decline:${payment.id}:${outcome}`, outcome);
    return redirect({ href: `${back}?card=${outcome}`, locale });
  }
  const paid = await debitVirtualWallet(user.email, payment.amountFils, "JOD", `plan:${payment.id}`, payment.plan ?? "plan");
  if (!paid.ok) {
    await recordVirtualDecline(user.email, payment.amountFils, "JOD", `decline:${payment.id}:insufficient`, "insufficient");
    return redirect({ href: `${back}?card=insufficient`, locale });
  }
  const event: ProviderEvent = { id: `evt_${crypto.randomUUID()}`, type: "payment.succeeded", paymentRef: payment.id, providerRef: payment.providerRef ?? `mock_${payment.id.slice(0, 8)}`, amountFils: payment.amountFils };
  const applied = await applyProviderEvent(paymentProvider().id, event);
  if (applied !== "ok" && applied !== "duplicate") {
    await creditVirtualWallet(user.email, payment.amountFils, "JOD", `undo:${payment.id}`, "plan payment was not applied");
    return redirect({ href: `${back}?card=declined`, locale });
  }
  return redirect({ href: "/studio/billing?paid=1", locale });
}

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
