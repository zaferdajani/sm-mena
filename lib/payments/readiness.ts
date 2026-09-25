import "server-only";
import { HOLDER_LINE, HOLDER_NAME, paymentStateOf, type PaymentState } from "@/lib/legal/payment-holder";
import { paymentProvider } from "./provider";

/**
 * The single switch for real protected payments (docs/14-contracts-and-milestones.md).
 * Live only when a real payment provider is configured (PAYMENTS_PROVIDER is
 * not "mock") AND PROTECTED_PAYMENTS_LIVE is exactly "true". Until then every
 * contract, pay and checkout screen, and the contract terms themselves, say
 * protected payments are in test mode with no real money.
 *
 * For landing, About and marketing copy use `protectedPaymentsCopy(locale)` so
 * the promise always matches what the terms and payment arrangement deliver.
 */
export function protectedPaymentsLive(): boolean {
  return paymentProvider().id !== "mock" && process.env.PROTECTED_PAYMENTS_LIVE?.trim() === "true";
}

export const protectedPaymentsState = (): PaymentState => paymentStateOf(protectedPaymentsLive());

/** Who holds the money, in one sentence, in the reader's language (ar or en). */
export function protectedPaymentsCopy(locale: string, live = protectedPaymentsLive()) {
  return HOLDER_LINE[paymentStateOf(live)][locale === "en" ? "en" : "ar"];
}

/** "Sawwiq's licensed payment partner" / "test mode (no real money)". */
export function paymentHolderName(locale: string, live = protectedPaymentsLive()) {
  return HOLDER_NAME[paymentStateOf(live)][locale === "en" ? "en" : "ar"];
}
