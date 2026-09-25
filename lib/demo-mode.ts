import "server-only";
import { cookies } from "next/headers";
import { featureState } from "@/lib/features";

/**
 * Demo agencies are samples for trying the product, never evidence about the
 * real market (docs/31-trust-and-demo.md). By default every public list,
 * count, price and recommendation uses real agencies only; a visitor can turn
 * on a clearly labelled demo view, remembered in this cookie. Prices, counts,
 * structured data, the sitemap and statistics stay real-only either way.
 */
export const DEMO_COOKIE = "sw_demo";

export async function demoMode(): Promise<boolean> {
  if ((await cookies()).get(DEMO_COOKIE)?.value !== "1") return false;
  // The demo view can be switched off (Admin → Features): then everyone sees real agencies only.
  return (await featureState("demo_view")) !== "off";
}
