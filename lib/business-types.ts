import { INDUSTRIES } from "@/lib/labels";

/**
 * Business types (the taxonomy's `business_types`, stored as `posts.industry`):
 * the tag on each post and the chips that filter the feed (docs/36-feed.md).
 */
export const BUSINESS_TYPES = INDUSTRIES;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const isBusinessType = (value: unknown): value is BusinessType => typeof value === "string" && (BUSINESS_TYPES as readonly string[]).includes(value);

/** A small picture for each type, so the tag reads at a glance in the feed. */
export const BUSINESS_EMOJI: Record<BusinessType, string> = {
  restaurant_cafe: "🍽️",
  clinic_health: "🩺",
  retail_shop: "🛍️",
  real_estate: "🏠",
  education: "🎓",
  beauty_fitness: "💄",
  ecommerce: "📦",
  professional_services: "💼",
  tourism_hospitality: "🏨",
  manufacturing: "🏭",
  ngo: "🤝",
  other: "✨",
};
