import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Payment provider adapter (docs/32-payment-partner.md). The platform runs on
// "mock" (a built-in test checkout, no real money) until a licensed payment
// partner is connected. A real partner implements this interface: take the
// client's milestone payment into its safeguarded account (checkout), pay the
// agency its share when a milestone is accepted (payout, with Sawwiq's fee
// kept back), return money to the client (refund), and tell us what happened
// (signed webhooks, including chargebacks). Sawwiq never holds the money.
// Protected payments go live only through lib/payments/readiness.ts.

export type CheckoutInput = { paymentRef: string; amountFils: number; currency?: string; description: string; returnPath: string };

/** Money out, one ledger entry at a time. `idemKey` is the ledger key ("rel:…", "ref:…"): the partner must treat it as an idempotency key. */
export type PayoutInput = { idemKey: string; contractId: string; milestoneId: string; agencyId: string; amountFils: number; feeFils: number; currency: string };
export type RefundInput = { idemKey: string; contractId: string; milestoneId: string; depositProviderRef: string | null; amountFils: number; currency: string };
/** succeeded: done now; pending: the partner will confirm by webhook; failed: nothing moved (retried by the daily job, then flagged to admins). */
export type MoneyResult = { status: "succeeded" | "pending" | "failed"; providerRef: string | null; error?: string };

export const EVENT_TYPES = ["payment.succeeded", "payment.failed", "payout.succeeded", "payout.failed", "refund.succeeded", "refund.failed", "chargeback.opened"] as const;
export type ProviderEvent = { id: string; type: (typeof EVENT_TYPES)[number]; paymentRef: string; providerRef: string; amountFils: number; currency?: string };

/**
 * The shape every provider notification must have once its signature is
 * verified. paymentRef is "ms_<milestone>" for deposits, the ledger key for
 * payouts and refunds, and the deposit's paymentRef for chargebacks.
 */
export const providerEventSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.enum(EVENT_TYPES),
  paymentRef: z.string().min(1).max(100),
  providerRef: z.string().max(200),
  amountFils: z.number().int().positive().max(1_000_000_000_000),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
});

export interface PaymentProvider {
  id: string;
  label: string;
  /** Where to send the payer. */
  createCheckout(input: CheckoutInput): Promise<{ redirectPath: string; providerRef: string }>;
  /** Pays an agency its share of an accepted milestone. */
  payout(input: PayoutInput): Promise<MoneyResult>;
  /** Returns (part of) a milestone payment to the client. */
  refund(input: RefundInput): Promise<MoneyResult>;
  /** Verifies and parses a provider notification (webhook); null if the signature is wrong. */
  parseWebhook(rawBody: string, headers: Headers): ProviderEvent | null;
}

const webhookSecret = () => process.env.PAYMENTS_WEBHOOK_SECRET || (process.env.NODE_ENV !== "production" ? "sawwiq-dev-webhook-secret" : "");

export function signWebhook(body: string) {
  return createHmac("sha256", webhookSecret()).update(body).digest("hex");
}

const mock: PaymentProvider = {
  id: "mock",
  label: "Test checkout (no real money)",
  async createCheckout(input) {
    return { redirectPath: `/pay/${input.paymentRef}`, providerRef: `mock_${input.paymentRef.slice(0, 8)}` };
  },
  // Test mode: nothing moves, so payouts and refunds "succeed" at once.
  async payout(input) {
    return { status: "succeeded", providerRef: `mock_${input.idemKey}` };
  },
  async refund(input) {
    return { status: "succeeded", providerRef: `mock_${input.idemKey}` };
  },
  parseWebhook(rawBody, headers) {
    const secret = webhookSecret();
    const given = headers.get("x-sawwiq-signature") ?? "";
    if (!secret || given.length !== 64) return null;
    if (!timingSafeEqual(Buffer.from(signWebhook(rawBody)), Buffer.from(given))) return null;
    try {
      const parsed = providerEventSchema.safeParse(JSON.parse(rawBody));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
};

const PROVIDERS: Record<string, PaymentProvider> = { mock };

/** Adds a partner adapter (lib/payments/<partner>.ts registers itself; tests register fakes). */
export function registerProvider(provider: PaymentProvider) {
  PROVIDERS[provider.id] = provider;
}

export function paymentProvider(): PaymentProvider {
  return PROVIDERS[process.env.PAYMENTS_PROVIDER || "mock"] ?? mock;
}

/** The adapter that recorded a ledger entry (payouts must go back to the same partner). */
export const providerById = (id: string): PaymentProvider | null => PROVIDERS[id] ?? null;

export const isTestPayments = () => paymentProvider().id === "mock";

/** JOD amounts: 1 dinar = 1000 fils. */
export const jodToFils = (jod: number) => Math.round(jod * 1000);
export { formatFils } from "@/lib/format";
