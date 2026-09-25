import "server-only";
import { cookies } from "next/headers";

/**
 * Demo agencies are samples for trying the product, never evidence about the
 * real market (docs/31-trust-and-demo.md). By default every public list,
 * count, price and recommendation uses real agencies only; a visitor can turn
 * on a clearly labelled demo view, remembered in this cookie. Prices, counts,
 * structured data, the sitemap and statistics stay real-only either way.
 */
export const DEMO_COOKIE = "sw_demo";

export async function demoMode(): Promise<boolean> {
  return (await cookies()).get(DEMO_COOKIE)?.value === "1";
}
