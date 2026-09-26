"use client";

import { registerTags, type TagInfo } from "@/lib/services/catalog";

/**
 * Hands the browser the service tags approved after the catalog file was
 * written, before anything below renders a service name or the type-ahead.
 */
export function ServiceRegistry({ tags }: { tags: TagInfo[] }) {
  if (tags.length) registerTags(tags);
  return null;
}
