import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, packages } from "@/lib/db/schema";
import { taxonomy } from "@/lib/taxonomy";
import { suggestBudget } from "./score";

/** Fewer prices than this and the budget question uses the currency's default ranges. */
const MIN_PRICES = 4;

/**
 * Monthly price quartiles per service group in one country (starting prices
 * and monthly packages of agencies based there, so one currency), for the
 * guided matchmaker's budget question. Two queries for all groups.
 */
export async function groupPriceStats(country: string) {
  const db = await getDb();
  const [starting, pkgs] = await Promise.all([
    db
      .select({ services: agencies.services, price: agencies.startingPriceJod })
      .from(agencies)
      .where(and(eq(agencies.status, "active"), eq(agencies.country, country))),
    db
      .select({ service: packages.service, price: packages.priceJod })
      .from(packages)
      .innerJoin(agencies, eq(packages.agencyId, agencies.id))
      .where(and(eq(packages.billing, "monthly"), eq(agencies.status, "active"), eq(agencies.country, country))),
  ]);
  const out: Record<string, ReturnType<typeof suggestBudget>> = {};
  for (const group of taxonomy.categories) {
    const keys = new Set<string>(group.services.map((s) => s.key));
    const prices = [
      ...starting.filter((a) => a.price !== null && a.services.some((s) => keys.has(s))).map((a) => a.price as number),
      ...pkgs.filter((p) => keys.has(p.service)).map((p) => p.price),
    ];
    out[group.key] = prices.length >= MIN_PRICES ? suggestBudget(prices) : null;
  }
  return out;
}
