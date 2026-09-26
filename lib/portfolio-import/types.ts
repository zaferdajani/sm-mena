// Turning an agency's PDF portfolio into posts and profile details
// (docs/36-portfolio-import.md). Shared by the browser and the server.

/** One PDF page as the browser read it: its text, and a small JPEG for the AI to look at. */
export type ImportPage = { index: number; text: string; image?: string | null };

export type PageKind = "work" | "cover" | "about" | "clients" | "contact";

/** A proposed post: which pages become its images, and what the agency will review. */
export type DraftPost = {
  pages: number[];
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
  clients: { name: string; industry: string | null }[];
};

export type ImportPlan = {
  mode: "ai" | "basic";
  kinds: Record<number, PageKind>;
  drafts: DraftPost[];
  profile: ProfileSuggestion;
};

export const IMPORT_LIMITS = { pages: 40, textPerPage: 4000, imagesPerPost: 10, aiPages: 24, thumbBytes: 220_000 } as const;
