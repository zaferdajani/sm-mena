import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { SITE_URL } from "@/lib/site";
import { providerEventSchema, type CheckoutInput, type MoneyResult, type PaymentProvider, type PayoutInput, type ProviderEvent, type RefundInput } from "./provider";

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE for a licensed payment partner adapter (docs/32-payment-partner.md,
// docs/33-protected-payments-go-live.md). NOT registered and NOT imported
// anywhere: it does nothing until someone fills in the TODOs below.
//
// To use it once the partner is signed and its sandbox keys are in GitHub
// secrets:
//   1. Copy this file to lib/payments/<partner>.ts (e.g. paytabs.ts) and set
//      `id` to the value PAYMENTS_PROVIDER will hold (e.g. "paytabs"). The
//      webhook URL becomes /api/payments/webhook/<id>.
//   2. Fill in every TODO: endpoints, auth headers, request bodies, response
//      and webhook mapping, the signature header.
//   3. Register it with registerProvider() once it is filled in: in
//      lib/payments/provider.ts, import it and call
//        registerProvider(<partner>);
//      right after the PROVIDERS map. (Don't call registerProvider at the top
//      level of this file: provider.ts would not have finished loading yet.)
//   4. Run the whole milestone flow against the partner's sandbox, then switch
//      on with PAYMENTS_PROVIDER=<id> and PROTECTED_PAYMENTS_LIVE=true.
//
// Rules that must survive the TODOs:
//   - Sawwiq never holds money. Checkout pays the partner; payout and refund
//     are instructions to the partner, which moves the money it holds.
//   - Every money-out call sends the ledger key (`idemKey`, "rel:…"/"ref:…")
//     as the partner's idempotency key AND as its merchant reference, so a
//     retry can never pay twice and webhooks can point back to the entry.
//   - Deposits use paymentRef "ms_<milestone>" as the partner's order/cart id;
//     the partner must echo it in payment and chargeback webhooks.
//   - Unfinished parts throw Error("not connected: …"). Never make them
//     "succeed" silently: lib/data/money-out.ts turns a throw into a failed
//     entry that is retried and then shown to admins.
// ─────────────────────────────────────────────────────────────────────────────

/** Partner API paths. TODO: fill in from the partner's API docs; null means "not built yet" and the call throws. */
const ENDPOINTS: { checkout: string | null; payout: string | null; refund: string | null } = {
  checkout: null, // TODO: hosted payment page request, e.g. "/payment/request"
  payout: null, // TODO: split payout / release to a seller (agency) account
  refund: null, // TODO: full or partial refund of the original payment
};

/**
 * Header carrying the partner's webhook signature. TODO: set from the partner's
 * docs (e.g. "signature", "x-signature"). null means webhooks are not
 * connected yet and every notification is refused.
 */
const SIGNATURE_HEADER: string | null = null;

const REQUEST_TIMEOUT_MS = 15_000;

function config() {
  const baseUrl = process.env.PAYMENTS_PARTNER_BASE_URL?.trim().replace(/\/$/, "") ?? "";
  const key = process.env.PAYMENTS_PARTNER_KEY?.trim() ?? "";
  const webhookSecret = process.env.PAYMENTS_WEBHOOK_SECRET?.trim() ?? "";
  // TODO: many partners also need a merchant/profile id. Add it as another
  // secret (e.g. PAYMENTS_PARTNER_MERCHANT_ID) and read it here.
  return { baseUrl, key, webhookSecret };
}

const notConnected = (what: string): never => {
  throw new Error(`not connected: ${what} (lib/payments/partner-template.ts is a template; see docs/33-protected-payments-go-live.md)`);
};

/**
 * Amounts are stored in thousandths of the currency ("fils"): 1 JOD = 1000.
 * JOD has 3 decimals; SAR and AED have 2, so their amounts must be whole
 * halalas/fils (multiples of 10 thousandths). TODO: check the format the
 * partner wants (decimal string, number, or minor units as an integer).
 */
function toPartnerAmount(amountFils: number, currency: string): string {
  const decimals = currency === "JOD" || currency === "KWD" || currency === "BHD" || currency === "OMR" ? 3 : 2;
  if (decimals === 2 && amountFils % 10 !== 0) throw new Error(`amount ${amountFils} has more precision than ${currency} allows`);
  return (amountFils / 1000).toFixed(decimals);
}

/** The reverse of toPartnerAmount, for amounts in webhooks. */
function fromPartnerAmount(value: string | number): number {
  return Math.round(Number(value) * 1000);
}

/**
 * One authenticated JSON call to the partner. Sends the idempotency key when
 * one is given. Throws on network errors, timeouts and non-2xx answers (the
 * caller turns that into a failed entry that the daily job retries).
 */
async function partnerRequest(endpoint: string | null, what: string, body: Record<string, unknown>, idemKey?: string): Promise<unknown> {
  const { baseUrl, key } = config();
  if (!endpoint) return notConnected(`${what} endpoint`);
  if (!baseUrl || !key) return notConnected(`${what}: PAYMENTS_PARTNER_BASE_URL or PAYMENTS_PARTNER_KEY is missing`);
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // TODO: the partner's auth header. Examples: `authorization: key` (PayTabs
      // server key), `authorization: \`Bearer ${key}\`` (HyperPay, Tap).
      authorization: `Bearer ${key}`,
      // TODO: the partner's idempotency header name, if it has one. If it has
      // none, rely on the unique merchant reference (idemKey) in the body and
      // ask the partner to confirm duplicates are refused.
      ...(idemKey ? { "idempotency-key": idemKey } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  const text = await res.text();
  // Never log or return the request body or headers: they carry the key.
  if (!res.ok) throw new Error(`partner ${what} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`partner ${what}: response is not JSON`);
  }
}

// ── Response shapes ──────────────────────────────────────────────────────────
// TODO: every field name in this file's requests, responses and webhooks
// (cart_id, tran_ref, redirect_url, …) is a placeholder modelled on common
// gateway APIs. Replace them with the partner's real fields. Read only what
// we need; zod ignores the rest.

const checkoutResponse = z.object({
  redirect_url: z.string().url(), // TODO: the hosted payment page URL field
  tran_ref: z.string().min(1), // TODO: the partner's transaction / order reference
});

const moneyResponse = z.object({
  tran_ref: z.string().min(1).optional(), // TODO: the partner's payout/refund reference
  status: z.string(), // TODO: the partner's status field
  message: z.string().optional(),
});

/**
 * Maps the partner's status words to ours. TODO: fill in from the docs.
 * Unknown words count as "pending": the webhook will tell us the outcome.
 */
function mapMoneyStatus(partnerStatus: string): MoneyResult["status"] {
  const s = partnerStatus.toLowerCase();
  if (["succeeded", "success", "approved", "paid"].includes(s)) return "succeeded"; // TODO
  if (["failed", "declined", "rejected", "error"].includes(s)) return "failed"; // TODO
  return "pending";
}

function toMoneyResult(raw: unknown, what: string): MoneyResult {
  const parsed = moneyResponse.safeParse(raw);
  if (!parsed.success) throw new Error(`partner ${what}: unexpected response shape`);
  const status = mapMoneyStatus(parsed.data.status);
  return { status, providerRef: parsed.data.tran_ref ?? null, ...(status === "failed" ? { error: parsed.data.message?.slice(0, 200) ?? `partner ${what} declined` } : {}) };
}

/**
 * The partner's id for an agency's payout account, created when the agency
 * completes the partner's hosted onboarding and identity check (KYC).
 * TODO: this needs a stored mapping (agency → partner account id), which is
 * not built yet. Until then payouts cannot be sent.
 */
async function partnerAccountFor(agencyId: string): Promise<string> {
  return notConnected(`payout account for agency ${agencyId} (partner onboarding/KYC not connected)`);
}

// ── Webhooks ─────────────────────────────────────────────────────────────────

/**
 * The partner's notification body. TODO: replace with the partner's real
 * fields. We need: a unique event id, the event kind, our reference (the
 * "ms_…" paymentRef for payments and chargebacks, the ledger key for payouts
 * and refunds), the partner's reference, the amount and currency.
 */
const partnerWebhook = z.object({
  event_id: z.string().min(1), // TODO
  event_type: z.string().min(1), // TODO
  merchant_reference: z.string().min(1), // TODO: echoes our paymentRef / idemKey
  tran_ref: z.string().min(1), // TODO
  amount: z.union([z.string(), z.number()]), // TODO
  currency: z.string().regex(/^[A-Z]{3}$/).optional(), // TODO
});

/**
 * Partner event kinds → ours. TODO: fill in every kind the partner sends
 * (and ask it to send all of them). Anything not listed is ignored (null),
 * which answers 401 to the partner; list harmless kinds you want to accept
 * silently in IGNORED_EVENTS instead so they are not retried forever.
 */
const EVENT_MAP: Record<string, ProviderEvent["type"]> = {
  // "payment.captured": "payment.succeeded",
  // "payment.declined": "payment.failed",
  // "payout.completed": "payout.succeeded",
  // "payout.failed": "payout.failed",
  // "refund.completed": "refund.succeeded",
  // "refund.failed": "refund.failed",
  // "dispute.created": "chargeback.opened",
};

/**
 * Checks the partner's signature on the raw body. Same pattern as the mock in
 * provider.ts: HMAC-SHA256 with PAYMENTS_WEBHOOK_SECRET, compared in constant
 * time. TODO: match the partner's scheme exactly (hex or base64, which bytes
 * are signed, any timestamp prefix to check against replay).
 */
function signatureValid(rawBody: string, headers: Headers): boolean {
  const { webhookSecret } = config();
  if (!SIGNATURE_HEADER) return notConnected("webhook signature header");
  if (!webhookSecret) return false;
  const given = headers.get(SIGNATURE_HEADER)?.trim().toLowerCase() ?? "";
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

// ── The adapter ──────────────────────────────────────────────────────────────

/**
 * Template adapter. Once filled in, register it with
 * `registerProvider(partnerTemplate)` (lib/payments/provider.ts).
 */
export const partnerTemplate: PaymentProvider = {
  id: "partner-template", // TODO: the PAYMENTS_PROVIDER value, e.g. "paytabs"
  label: "Licensed payment partner (template, not connected)", // TODO: e.g. "PayTabs"

  async createCheckout(input: CheckoutInput) {
    const currency = input.currency ?? "JOD";
    // TODO: the partner's hosted-checkout request body. It must:
    //  - use input.paymentRef ("ms_<milestone>") as the order/cart id, so the
    //    payment webhook and any chargeback point back to the milestone;
    //  - hold the payment (authorise/capture into the partner's safeguarded
    //    account) without paying the agency — payout happens later, on our
    //    instruction;
    //  - send the client back to SITE_URL + input.returnPath afterwards and
    //    notify /api/payments/webhook/<id>.
    const raw = await partnerRequest(
      ENDPOINTS.checkout,
      "checkout",
      {
        cart_id: input.paymentRef, // TODO
        cart_amount: toPartnerAmount(input.amountFils, currency), // TODO
        cart_currency: currency, // TODO
        cart_description: input.description.slice(0, 120), // TODO
        return: `${SITE_URL}${input.returnPath}`, // TODO
        callback: `${SITE_URL}/api/payments/webhook/${partnerTemplate.id}`, // TODO
      },
      // A second click on "Pay" for the same milestone reuses the same key.
      `chk:${input.paymentRef}`,
    );
    const parsed = checkoutResponse.safeParse(raw);
    if (!parsed.success) throw new Error("partner checkout: unexpected response shape");
    // redirectPath may be an absolute URL (the partner's hosted page).
    return { redirectPath: parsed.data.redirect_url, providerRef: parsed.data.tran_ref };
  },

  async payout(input: PayoutInput) {
    const account = await partnerAccountFor(input.agencyId);
    // TODO: the partner's split payout / release request. It must:
    //  - pay input.amountFils (already net of Sawwiq's fee) to the agency's
    //    partner account;
    //  - send input.feeFils to Sawwiq's own partner account (or keep it as the
    //    platform's share, as the partner's split model does it);
    //  - use input.idemKey ("rel:<milestone>") as idempotency key AND merchant
    //    reference, so the payout webhook's reference is the ledger key.
    const raw = await partnerRequest(
      ENDPOINTS.payout,
      "payout",
      {
        reference: input.idemKey, // TODO
        beneficiary: account, // TODO
        amount: toPartnerAmount(input.amountFils, input.currency), // TODO
        platform_fee: toPartnerAmount(input.feeFils, input.currency), // TODO
        currency: input.currency, // TODO
        metadata: { contractId: input.contractId, milestoneId: input.milestoneId }, // TODO
      },
      input.idemKey,
    );
    return toMoneyResult(raw, "payout");
  },

  async refund(input: RefundInput) {
    // A refund goes against the original payment. Without its reference the
    // partner can't find it: report a failure so an admin looks at it.
    if (!input.depositProviderRef) return { status: "failed", providerRef: null, error: "no deposit reference to refund against" };
    // TODO: the partner's refund request (full or partial). It must use
    // input.idemKey ("ref:<milestone>") as idempotency key AND merchant
    // reference, so the refund webhook's reference is the ledger key.
    const raw = await partnerRequest(
      ENDPOINTS.refund,
      "refund",
      {
        tran_ref: input.depositProviderRef, // TODO
        reference: input.idemKey, // TODO
        amount: toPartnerAmount(input.amountFils, input.currency), // TODO
        currency: input.currency, // TODO
        reason: `Sawwiq milestone ${input.milestoneId}`, // TODO
      },
      input.idemKey,
    );
    return toMoneyResult(raw, "refund");
  },

  parseWebhook(rawBody: string, headers: Headers) {
    if (!signatureValid(rawBody, headers)) return null;
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const body = partnerWebhook.safeParse(json);
    if (!body.success) return null;
    const type = EVENT_MAP[body.data.event_type];
    if (!type) return null; // TODO: see EVENT_MAP about kinds to ignore quietly
    // paymentRef: "ms_<milestone>" for payment.* and chargeback.opened (the
    // cart id we sent at checkout); the ledger key "rel:…"/"ref:…" for
    // payout.* and refund.* (the reference we sent with the instruction).
    const event: ProviderEvent = {
      // Must be unique per notification: payment_events stores it once.
      id: body.data.event_id,
      type,
      paymentRef: body.data.merchant_reference,
      providerRef: body.data.tran_ref,
      amountFils: fromPartnerAmount(body.data.amount),
      ...(body.data.currency ? { currency: body.data.currency } : {}),
    };
    // Final check against the shape the rest of the app relies on.
    const checked = providerEventSchema.safeParse(event);
    return checked.success ? checked.data : null;
  },
};
