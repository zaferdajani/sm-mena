import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings, contracts } from "@/lib/db/schema";
import { virtualPaymentsAllowed } from "@/lib/core/rules/staging";
import { isTestPayments } from "./provider";

const KEY = "virtual_wallets";

export type VirtualEntry = {
  id: string;
  at: string;
  kind: "open" | "debit" | "credit" | "decline";
  amountFils: number;
  currency: string;
  ref: string;
  note: string;
};

type Account = { balances: Record<string, number>; entries: VirtualEntry[] };
type Book = Record<string, Account>;

const empty = (): Account => ({ balances: {}, entries: [] });

export const walletKeyOf = (emailOrKey: string) => emailOrKey.trim().toLowerCase();

/** Card form and wallet ledger. Mock provider only, and never on the live site. */
export function virtualCheckoutEnabled() {
  return virtualPaymentsAllowed() && isTestPayments();
}

async function updateBook(change: (book: Book) => void): Promise<Book> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.insert(appSettings).values({ key: KEY, value: {} }).onConflictDoNothing();
    const [row] = await tx.select().from(appSettings).where(eq(appSettings.key, KEY)).for("update");
    const book: Book = row?.value && typeof row.value === "object" && !Array.isArray(row.value) ? { ...(row.value as Book) } : {};
    change(book);
    await tx.update(appSettings).set({ value: book, updatedAt: new Date() }).where(eq(appSettings.key, KEY));
    return book;
  });
}

function account(book: Book, key: string): Account {
  const current = book[key];
  const next: Account = current && typeof current === "object"
    ? { balances: { ...(current.balances ?? {}) }, entries: Array.isArray(current.entries) ? [...current.entries] : [] }
    : empty();
  book[key] = next;
  return next;
}

function push(acct: Account, entry: Omit<VirtualEntry, "id" | "at">) {
  acct.entries.unshift({ ...entry, id: crypto.randomUUID(), at: new Date().toISOString() });
  acct.entries = acct.entries.slice(0, 80);
}

export async function readVirtualWallet(emailOrKey: string): Promise<Account> {
  if (!virtualCheckoutEnabled()) return empty();
  const db = await getDb();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, KEY));
  const book = (row?.value ?? {}) as Book;
  return book[walletKeyOf(emailOrKey)] ?? empty();
}

export async function readAllVirtualWallets(): Promise<{ key: string; account: Account }[]> {
  if (!virtualCheckoutEnabled()) return [];
  const db = await getDb();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, KEY));
  const book = (row?.value ?? {}) as Book;
  return Object.entries(book).map(([key, account]) => ({ key, account })).sort((a, b) => a.key.localeCompare(b.key));
}

/** Gives a staging account a starting balance once per currency. */
export async function openVirtualWallet(emailOrKey: string, currency: string, amountFils: number) {
  if (!virtualCheckoutEnabled() || amountFils <= 0) return;
  const key = walletKeyOf(emailOrKey);
  const ref = `open:${currency}`;
  await updateBook((book) => {
    const acct = account(book, key);
    if (acct.entries.some((e) => e.ref === ref && e.kind === "open")) return;
    acct.balances[currency] = (acct.balances[currency] ?? 0) + amountFils;
    push(acct, { kind: "open", amountFils, currency, ref, note: "opening balance" });
  });
}

export async function recordVirtualDecline(emailOrKey: string, amountFils: number, currency: string, ref: string, note: string) {
  if (!virtualCheckoutEnabled()) return;
  const key = walletKeyOf(emailOrKey);
  await updateBook((book) => {
    const acct = account(book, key);
    if (acct.entries.some((e) => e.ref === ref && e.kind === "decline")) return;
    push(acct, { kind: "decline", amountFils, currency, ref, note });
  });
}

export async function debitVirtualWallet(emailOrKey: string, amountFils: number, currency: string, ref: string, note: string): Promise<{ ok: true; balance: number } | { ok: false; reason: "insufficient" | "disabled" }> {
  if (!virtualCheckoutEnabled()) return { ok: false, reason: "disabled" };
  const key = walletKeyOf(emailOrKey);
  let result: { ok: true; balance: number } | { ok: false; reason: "insufficient" } = { ok: false, reason: "insufficient" };
  await updateBook((book) => {
    const acct = account(book, key);
    const prior = acct.entries.find((e) => e.ref === ref && e.kind === "debit");
    if (prior) {
      result = { ok: true, balance: acct.balances[currency] ?? 0 };
      return;
    }
    const balance = acct.balances[currency] ?? 0;
    if (balance < amountFils) {
      result = { ok: false, reason: "insufficient" };
      return;
    }
    acct.balances[currency] = balance - amountFils;
    push(acct, { kind: "debit", amountFils, currency, ref, note });
    result = { ok: true, balance: acct.balances[currency] };
  });
  return result;
}

export async function creditVirtualWallet(emailOrKey: string, amountFils: number, currency: string, ref: string, note: string) {
  if (!virtualCheckoutEnabled() || amountFils <= 0) return;
  const key = walletKeyOf(emailOrKey);
  await updateBook((book) => {
    const acct = account(book, key);
    if (acct.entries.some((e) => e.ref === ref && e.kind === "credit")) return;
    acct.balances[currency] = (acct.balances[currency] ?? 0) + amountFils;
    push(acct, { kind: "credit", amountFils, currency, ref, note });
  });
}

/** Puts a milestone refund back on the contract client's virtual wallet. No-op unless the sandbox is on. */
export async function creditContractRefund(contractId: string, milestoneId: string, amountFils: number) {
  if (!virtualCheckoutEnabled() || amountFils <= 0) return;
  const db = await getDb();
  const [row] = await db.select({ email: contracts.clientEmail, currency: contracts.currency }).from(contracts).where(eq(contracts.id, contractId));
  if (!row) return;
  await creditVirtualWallet(row.email || `contract:${contractId}`, amountFils, row.currency, `ref:${milestoneId}`, "milestone refund");
}
