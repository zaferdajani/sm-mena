/**
 * One model for a legal document (contract or NDA), rendered twice: as the
 * page both parties read (components/contracts/*) and as the signed PDF
 * execution copy (lib/pdf/*). Built by lib/legal/document.ts.
 */

export type DocBlock = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Numbered sub-items, e.g. milestones: title line and detail lines. */
  numbered?: { title: string; detail?: string; lines?: string[] }[];
};

export type DocSignature = {
  /** "Agency" / "Client" (localized). */
  role: string;
  /** Legal name of the party (agency name, client name). */
  party: string;
  /** The typed full name of the person who signed. */
  signerName: string | null;
  signedAt: Date | null;
  /** Drawn signature as PNG bytes, when captured. */
  image?: Uint8Array | null;
  /** Evidence: sha256 of the signer's IP (never the IP itself). */
  ipHash?: string | null;
};

export type LegalDocument = {
  kind: "contract" | "nda" | "receipt";
  locale: "ar" | "en";
  dir: "rtl" | "ltr";
  title: string;
  number: string;
  /** e.g. project title or NDA purpose. */
  subtitle?: string;
  blocks: DocBlock[];
  signatures: DocSignature[];
  /** sha256 of the canonical terms both parties signed. */
  fingerprint: string;
  /** IANA time zone for printed timestamps (the contract country's). */
  timeZone: string;
  /** Printed diagonally on every page, e.g. "TEST MODE — NO REAL MONEY". */
  watermark?: string;
  /** Localized labels the renderer needs. */
  labels: {
    page: string; // "Page {n} of {total}" pattern with {n} and {total}
    evidenceTitle: string;
    signedAt: string;
    notSigned: string;
    fingerprint: string;
    ipHash: string;
    evidenceNote: string;
  };
};
