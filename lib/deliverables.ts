import type { DeliverableLine } from "@/lib/db/schema";

// What agencies can put in a package or contract, grouped for a simple picker.
// Labels live in messages (Deliverables.items.<key>); "unit" says how the
// quantity is counted, "platform" whether a platform must be chosen.

export type DeliverableGroup = "content" | "accounts" | "ads" | "web" | "branding" | "offline" | "reports";
export type Deliverable = { key: string; group: DeliverableGroup; unit: "item" | "month" | "page" | "day" | "session"; platform: boolean; offline?: boolean };

export const DELIVERABLES: Deliverable[] = [
  // Content
  { key: "feed_posts", group: "content", unit: "item", platform: true },
  { key: "carousels", group: "content", unit: "item", platform: true },
  { key: "reels", group: "content", unit: "item", platform: true },
  { key: "stories", group: "content", unit: "item", platform: true },
  { key: "graphic_designs", group: "content", unit: "item", platform: false },
  { key: "captions", group: "content", unit: "item", platform: false },
  { key: "motion_videos", group: "content", unit: "item", platform: false },
  { key: "blog_articles", group: "content", unit: "item", platform: false },
  // Accounts handled
  { key: "account_management", group: "accounts", unit: "month", platform: true },
  { key: "community_replies", group: "accounts", unit: "month", platform: true },
  { key: "account_setup", group: "accounts", unit: "item", platform: true },
  { key: "content_calendar", group: "accounts", unit: "month", platform: false },
  // Ads
  { key: "ad_campaigns", group: "ads", unit: "item", platform: true },
  { key: "ad_creatives", group: "ads", unit: "item", platform: false },
  { key: "influencer_posts", group: "ads", unit: "item", platform: true },
  // Web
  { key: "website_pages", group: "web", unit: "page", platform: false },
  { key: "landing_page", group: "web", unit: "item", platform: false },
  { key: "online_store", group: "web", unit: "item", platform: false },
  { key: "website_maintenance", group: "web", unit: "month", platform: false },
  { key: "seo_optimization", group: "web", unit: "month", platform: false },
  { key: "hosting_domain", group: "web", unit: "month", platform: false },
  // Branding
  { key: "logo", group: "branding", unit: "item", platform: false },
  { key: "brand_identity", group: "branding", unit: "item", platform: false },
  { key: "brand_guidelines", group: "branding", unit: "item", platform: false },
  { key: "packaging", group: "branding", unit: "item", platform: false },
  // Offline / on-site
  { key: "photo_session", group: "offline", unit: "session", platform: false, offline: true },
  { key: "video_shoot_day", group: "offline", unit: "day", platform: false, offline: true },
  { key: "event_coverage", group: "offline", unit: "day", platform: false, offline: true },
  { key: "print_materials", group: "offline", unit: "item", platform: false, offline: true },
  { key: "outdoor_ad", group: "offline", unit: "item", platform: false, offline: true },
  { key: "activation_event", group: "offline", unit: "item", platform: false, offline: true },
  // Reports and meetings
  { key: "monthly_report", group: "reports", unit: "item", platform: false },
  { key: "strategy_session", group: "reports", unit: "session", platform: false },
];

export const DELIVERABLE_GROUPS: DeliverableGroup[] = ["content", "accounts", "ads", "web", "branding", "offline", "reports"];
const byKey = new Map(DELIVERABLES.map((d) => [d.key, d]));
export const deliverable = (key: string) => byKey.get(key);
export const isDeliverableKey = (key: string) => byKey.has(key);

/** Cleans user input: known keys, sane quantities, platform only where it applies. */
export function normalizeLines(lines: unknown, platforms: readonly string[]): DeliverableLine[] {
  if (!Array.isArray(lines)) return [];
  return lines
    .map((l) => l as Partial<DeliverableLine>)
    .filter((l) => typeof l.key === "string" && byKey.has(l.key))
    .map((l) => {
      const d = byKey.get(l.key!)!;
      const quantity = Math.min(999, Math.max(1, Math.round(Number(l.quantity) || 1)));
      const platform = d.platform && typeof l.platform === "string" && platforms.includes(l.platform) ? l.platform : null;
      return { key: d.key, quantity, platform };
    })
    .slice(0, 30);
}

/** "12 × Reels (Instagram)" in the given language. `t` is a Deliverables translator. */
export function lineLabel(line: DeliverableLine, t: (key: string, values?: Record<string, string | number>) => string, platformName?: (p: string) => string) {
  const name = t(`items.${line.key}`);
  const unit = deliverable(line.key)?.unit ?? "item";
  const qty = unit === "item" ? `${line.quantity} × ` : "";
  const suffix = unit !== "item" ? ` · ${t(`units.${unit}`, { count: line.quantity })}` : "";
  const platform = line.platform ? ` (${platformName ? platformName(line.platform) : line.platform})` : "";
  return `${qty}${name}${platform}${suffix}`;
}
