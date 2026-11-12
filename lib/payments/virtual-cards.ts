/**
 * Built-in virtual card rules for the staging checkout. Only the numbers
 * listed here do anything. Any other number is refused, so a real card can
 * never be treated as a successful payment. No gateway is contacted.
 */

export const TEST_CARDS = {
  success: "4242424242424242",
  declined: "4000000000000002",
  insufficient: "4000000000009995",
  expired: "4000000000000069",
  cvc: "4000000000000127",
} as const;

export const CARD_OUTCOMES = ["success", "declined", "insufficient", "expired", "cvc", "invalid", "unknown"] as const;
export type CardOutcome = (typeof CARD_OUTCOMES)[number];

export type CardInput = { number: string; expiry: string; cvc: string; name: string };

export const normalizeCardNumber = (raw: string) => raw.replace(/[\s-]/g, "");

export function formatCardNumber(digits: string) {
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Last moment a MM/YY card is still valid (end of that month, UTC). */
export function cardExpiryEnd(expiry: string): Date | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month, 0, 23, 59, 59));
}

export function evaluateTestCard(input: CardInput, now = new Date()): CardOutcome {
  const number = normalizeCardNumber(input.number);
  const name = input.name.trim();
  const cvc = input.cvc.trim();
  const expiry = input.expiry.trim();
  if (!/^\d{16}$/.test(number) || name.length < 2 || name.length > 60 || !/^\d{3,4}$/.test(cvc)) return "invalid";
  const expiryEnd = cardExpiryEnd(expiry);
  if (!expiryEnd) return "invalid";
  if (number === TEST_CARDS.cvc) return "cvc";
  if (number === TEST_CARDS.expired || now > expiryEnd) return "expired";
  if (number === TEST_CARDS.insufficient) return "insufficient";
  if (number === TEST_CARDS.declined) return "declined";
  if (number === TEST_CARDS.success) return "success";
  return "unknown";
}
