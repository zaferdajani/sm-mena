// Turning an agency's PDF portfolio into posts and profile details
// (docs/36-portfolio-import.md). Shared by the browser and the server.

/** What the page's pixels showed (lib/portfolio-import/layout.ts). */
export type LayoutKind = "gallery" | "logos" | "single" | "plain";

/**
 * One PDF page as the browser read it: its text (from the PDF, or read off the
 * image on the device), a small JPEG for the AI to look at, its layout, and
 * the text read off each cut-out piece (a logo's wordmark).
 */
export type ImportPage = { index: number; text: string; image?: string | null; layout?: LayoutKind; crops?: number; cropTexts?: string[] };

export type PageKind = "work" | "cover" | "about" | "services" | "clients" | "contact";

/** A post image: a whole page, or one piece cut out of it (a photo in a grid). */
export type ImageRef = { page: number; crop: number | null };

/** A proposed post: which pages it comes from, its images, and what the agency will review. */
export type DraftPost = {
  pages: number[];
  images: ImageRef[];
  title: string;
  caption: string;
  services: string[];
  platforms: string[];
  industry: string | null;
  client: string | null;
  result: string | null;
};

export type ProfileSuggestion = {
  about: string | null;
  strengths: string[];
  /** Services the portfolio names that the agency doesn't list yet. */
  services: string[];
  /** Clients named in the text or shown as logos (the logo helps the agency type the name). */
  clients: { name: string; industry: string | null; logo?: ImageRef }[];
  /** The agency's logo from the cover, offered as its page picture. */
  avatar: ImageRef | null;
};

export type ImportPlan = {
  mode: "ai" | "basic";
  kinds: Record<number, PageKind>;
  drafts: DraftPost[];
  profile: ProfileSuggestion;
};

export const IMPORT_LIMITS = { pages: 40, textPerPage: 4000, imagesPerPost: 10, aiPages: 24, thumbBytes: 220_000, cropsPerPage: 20, ocrMinChars: 40 } as const;
