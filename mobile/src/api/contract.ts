// The bearer API's shapes as the app reads them (docs/architecture/mobile-and-api-roadmap.md §4, §8.1).
// Mirrors lib/api/errors.ts and the /api/v1 route handlers; tests/unit/mobile-client.test.ts keeps the
// error codes and the publish rule in step with the server. Pure TypeScript: no React, no React Native.

export const API_ERROR_CODES = [
  "unauthenticated",
  "mfa_required",
  "forbidden",
  "not_found",
  "invalid",
  "stale",
  "conflict",
  "rate_limited",
  "unavailable",
  "upgrade_required",
  "internal",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type ApiErrorBody = {
  error: { code: ApiErrorCode; reason?: string; fields?: { path: string; issue: string }[]; retryAfter?: number };
};

export type SetupMedia = { id: string; url: string; width: number; height: number };
export type SetupData = {
  source?: "upload" | "pdf" | "behance" | "social";
  client?: { mode: "existing" | "personal" | "private"; clientId?: string };
  project?: { title: string; contribution: string; services: string[] };
};
export type Setup = {
  status: "in_progress" | "paused" | "finished";
  step: number;
  version: number;
  data: SetupData;
  postId: string | null;
  media: SetupMedia[];
};

export type Agency = {
  id: string;
  handle: string;
  name: string;
  nameTranslation: string | null;
  contentLang: "ar" | "en";
  city: string;
  avatarUrl: string | null;
  isVerified: boolean;
  pioneerNumber: number | null;
  country: string;
  services: string[];
  pendingServices: string[];
  bio: string | null;
  email: string | null;
  whatsapp: string | null;
  phone: string | null;
  website: string | null;
  postCount: number;
  followerCount: number;
  status: string;
  visibility: "private" | "unlisted" | "public" | string;
};

export type User = { id: string; email?: string; role: string; mfaEnabled: boolean };
export type Me = { user: User; agency: Agency | null; setup: Setup | null };
export type Login = { token: string; expiresAt: string; user: User };
export type ProjectImage = { url: string; width?: number; height?: number };
export type Project = {
  id: string;
  caption: string;
  services: string[];
  platforms: string[];
  createdAt: string;
  status: "published" | "hidden";
  images: ProjectImage[];
  agency: { id: string; handle: string; name: string };
};
export type ProjectAnswer = { project: Project; owner: boolean };

export const MAX_IMAGES_PER_POST = 10;

/** The same rule the server runs before publishing (lib/data/portfolio-setup.ts missingForPublish). */
export type PublishBlocker = "noProject" | "noServices" | "noMedia";
export function missingForPublish(view: Pick<Setup, "data" | "media">): PublishBlocker | null {
  const p = view.data.project;
  if (!p || p.title.trim().length < 2 || p.contribution.trim().length < 2) return "noProject";
  if (!p.services.length) return "noServices";
  if (!view.media.length) return "noMedia";
  return null;
}
