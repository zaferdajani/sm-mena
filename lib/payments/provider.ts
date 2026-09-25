import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Payment provider adapter. The platform runs on "mock" (a built-in test
// checkout, no real money) until a Jordanian gateway is connected. A real
// provider (HyperPay, PayTabs, Tap, …) implements the same three functions;
// for protected milestone payments it must support holding funds and paying
// out to agencies (marketplace / split payouts). See docs/14-contracts-and-milestones.md;
// protected payments go live only through lib/payments/readiness.ts.

export type CheckoutInput = { paymentRef: string; amountFils: number; currency?: string; description: string; returnPath: string };
export type ProviderEvent = { id: string; type: "payment.succeeded" | "payment.failed"; paymentRef: string; providerRef: string; amountFils: number; currency?: string };

/** The shape every provider notification must have once its signature is verified. */
export const providerEventSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.enum(["payment.succeeded", "payment.failed"]),
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

export function paymentProvider(): PaymentProvider {
  return PROVIDERS[process.env.PAYMENTS_PROVIDER || "mock"] ?? mock;
}

export const isTestPayments = () => paymentProvider().id === "mock";

/** JOD amounts: 1 dinar = 1000 fils. */
export const jodToFils = (jod: number) => Math.round(jod * 1000);
export { formatFils } from "@/lib/format";
