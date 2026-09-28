// Production templates (docs/50 §templates): reusable draft scopes for the
// work agencies repeat most. A template carries deliverables, a scope
// skeleton and review rules only: never dates, rates, permissions, files or
// people, which every cycle must confirm afresh.
import type { DeliverableLine } from "@/lib/db/schema";

export const TEMPLATE_KEYS = ["shoot", "reels", "arabic_copy", "ad_creative", "monthly_calendar"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type Template = { key: TemplateKey; deliverables: DeliverableLine[]; revisionAllowance: number; reviewDays: number; roles: string[] };

export const TEMPLATES: Record<TemplateKey, Template> = {
  shoot: { key: "shoot", deliverables: [{ key: "photo_session", quantity: 1, platform: null }, { key: "feed_posts", quantity: 12, platform: "instagram" }], revisionAllowance: 2, reviewDays: 7, roles: ["photographer", "graphic_designer"] },
  reels: { key: "reels", deliverables: [{ key: "video_shoot_day", quantity: 1, platform: null }, { key: "reels", quantity: 4, platform: "instagram" }], revisionAllowance: 2, reviewDays: 5, roles: ["videographer", "video_editor"] },
  arabic_copy: { key: "arabic_copy", deliverables: [{ key: "captions", quantity: 20, platform: null }, { key: "blog_articles", quantity: 2, platform: null }], revisionAllowance: 2, reviewDays: 5, roles: ["content_writer_ar"] },
  ad_creative: { key: "ad_creative", deliverables: [{ key: "ad_creatives", quantity: 6, platform: null }, { key: "ad_campaigns", quantity: 1, platform: "meta" }], revisionAllowance: 2, reviewDays: 5, roles: ["graphic_designer", "media_buyer"] },
  monthly_calendar: { key: "monthly_calendar", deliverables: [{ key: "content_calendar", quantity: 1, platform: null }, { key: "feed_posts", quantity: 12, platform: "instagram" }, { key: "stories", quantity: 8, platform: "instagram" }], revisionAllowance: 1, reviewDays: 7, roles: ["content_writer_ar", "graphic_designer"] },
};

export const isTemplateKey = (k: string): k is TemplateKey => (TEMPLATE_KEYS as readonly string[]).includes(k);

/**
 * What a rehire copies from a finished engagement: the deliverables and the
 * scope text only. Dates, compensation, permission scope, files and any
 * access are deliberately dropped and must be confirmed again (AC25).
 */
export function rehireDraft(v: { deliverables: DeliverableLine[]; scope: string }) {
  return { deliverables: v.deliverables.map((d) => ({ key: d.key, quantity: d.quantity, platform: d.platform ?? null })), scope: v.scope, dueOn: null, compensationNote: "", permissionScope: "" };
}
