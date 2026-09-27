// Pulling a provider's Behance portfolio into Sawwiq (docs/47-behance-import.md).
// Behance closed its public API to new applications years ago, so the import
// reads what Behance publishes for everyone: the RSS feed of a profile, the
// public project pages and the public profile page. Nothing needs a key, and
// nothing is written until the provider reviews it.

export type BehanceImage = { url: string; width: number | null; height: number | null };

export type BehanceProject = {
  /** Behance's numeric project id (from /gallery/{id}/{slug}). */
  id: string;
  url: string;
  title: string;
  /** Plain text: the project description, or the feed's summary. */
  description: string;
  cover: string | null;
  /** Full-size images in project order; empty until the project page was read. */
  images: BehanceImage[];
  /** Behance creative fields ("Branding", "Photography"). */
  fields: string[];
  tags: string[];
  publishedAt: Date | null;
  /** Behance usernames credited on the project. */
  owners: string[];
};

export type BehanceProfile = {
  username: string;
  displayName: string;
  url: string;
  website: string | null;
  bio: string | null;
  avatar: string | null;
  fields: string[];
  /** Every http(s) link found on the profile (social links, website). */
  links: string[];
};

/** What the review screen shows for one project, in Sawwiq's terms. */
export type BehanceDraft = {
  project: BehanceProject;
  caption: string;
  services: string[];
  platforms: string[];
  industry: string | null;
  client: string | null;
};

export type BehanceProfileSuggestion = {
  about: string | null;
  website: string | null;
  avatar: string | null;
  /** Services the Behance profile and projects name that the agency doesn't list yet. */
  services: string[];
};

export type BehancePortfolio = {
  profile: BehanceProfile | null;
  drafts: BehanceDraft[];
  suggestion: BehanceProfileSuggestion;
  /** Whether the Behance profile points back at this provider (its website or its Sawwiq page). */
  ownership: "verified" | "unverified";
  /** How the project list was found. */
  source: "feed" | "project";
  /** Projects the feed listed beyond the read limit. */
  truncated: boolean;
};

export const BEHANCE_LIMITS = {
  /** Projects read per import (each one is a page fetch). */
  projects: 12,
  imagesPerProject: 10,
  /** Bytes of HTML or XML we are willing to read from Behance. */
  pageBytes: 4 * 1024 * 1024,
  /** Bytes per image (the same ceiling as an upload). */
  imageBytes: 10 * 1024 * 1024,
  timeoutMs: 12_000,
  caption: 2200,
} as const;

/** behance.net and its image CDNs only (the server never talks to another host). */
export function isBehanceHost(hostname: string) {
  const h = hostname.toLowerCase();
  return h === "behance.net" || h.endsWith(".behance.net");
}

/** The bookmarklet's messages (docs/47): what the Behance tab sends, and how the import tab says it is ready. */
export const HANDOFF_MESSAGE = "sawwiq-behance-page";
export const HANDOFF_READY = "sawwiq-import-ready";
