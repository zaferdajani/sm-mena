import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { seal, tryOpen } from "@/lib/auth/secret-box";
import { getDb } from "@/lib/db";
import { agencies, ndas, type Nda } from "@/lib/db/schema";
import { LEGAL_VERSION } from "@/lib/legal/jurisdictions";
import { NDA_YEARS, hashTerms, ipHash } from "./contracts";
import { hashToken } from "./reviews";

// Standalone non-disclosure agreements (docs/22-legal-documents.md): an agency
// sends one before a client shares its brief, plans or account access. Signed
// like a contract: the agency signs when it sends (typed name + drawn
// signature over the sha256 of the terms), the client signs through a private
// link. The signed fields are frozen by a database trigger.

export const NDA_DIRECTIONS = ["mutual", "client_discloses", "agency_discloses"] as const;
export type NdaDirection = (typeof NDA_DIRECTIONS)[number];

export type NdaInput = {
  direction: NdaDirection;
  purpose: string;
  years: number;
  agencyLegalName?: string | null;
  agencyRegNumber?: string | null;
  agencyTerms?: string | null;
  clientTerms?: string | null;
  client: { name: string; phone: string; email?: string | null; regNumber?: string | null };
  signerName: string;
  signature: Uint8Array | null;
  signIp?: string | null;
  locale: string;
};

export type NdaError = "purpose" | "client" | "signer" | "signature";

/** Everything both parties agree to, in a stable order. Its hash is what gets signed. */
export function ndaCanonicalTerms(n: {
  number: string;
  agencyId: string;
  direction: string;
  purpose: string;
  years: number;
  legal: { version: string; jurisdiction: string; city: string };
  agencyLegalName: string;
  agencyRegNumber: string | null;
  agencyTerms: string | null;
  clientTerms: string | null;
  client: { name: string; phone: string; email: string | null; regNumber: string | null };
}) {
  return JSON.stringify({
    kind: "nda",
    number: n.number,
    agencyId: n.agencyId,
    direction: n.direction,
    purpose: n.purpose,
    years: n.years,
    legal: [n.legal.version, n.legal.jurisdiction, n.legal.city],
    parties: [n.agencyLegalName, n.agencyRegNumber, n.client.regNumber],
    client: [n.client.name, n.client.phone, n.client.email],
    agencyTerms: n.agencyTerms,
    clientTerms: n.clientTerms,
  });
}

function ndaNumber() {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  return `NDA-${new Date().getUTCFullYear()}-${Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]).join("")}`;
}

const cut = (v: string | null | undefined, n: number) => (v ? v.trim().slice(0, n) || null : null);
const b64 = (bytes: Uint8Array | null | undefined) => (bytes?.length ? Buffer.from(bytes).toString("base64") : null);

export async function createNda(agencyId: string, raw: NdaInput): Promise<{ error: NdaError } | { nda: Nda; token: string }> {
  const purpose = cut(raw.purpose, 1000) ?? "";
  if (purpose.length < 10) return { error: "purpose" };
  const client = { name: cut(raw.client.name, 80) ?? "", phone: cut(raw.client.phone, 20) ?? "", email: cut(raw.client.email, 200), regNumber: cut(raw.client.regNumber, 60) };
  if (client.name.length < 2 || client.phone.length < 7) return { error: "client" };
  const signerName = cut(raw.signerName, 80) ?? "";
  if (signerName.length < 3) return { error: "signer" };
  if (!raw.signature?.length) return { error: "signature" };

  const db = await getDb();
  const [agency] = await db.select({ name: agencies.name, country: agencies.country, city: agencies.city }).from(agencies).where(eq(agencies.id, agencyId));
  if (!agency) return { error: "client" };
  const number = ndaNumber();
  const token = randomBytes(18).toString("base64url");
  const fields = {
    number,
    agencyId,
    direction: (NDA_DIRECTIONS as readonly string[]).includes(raw.direction) ? raw.direction : "mutual",
    purpose,
    years: (NDA_YEARS as readonly number[]).includes(raw.years) ? raw.years : 2,
    legal: { version: LEGAL_VERSION, jurisdiction: agency.country, city: agency.city },
    agencyLegalName: cut(raw.agencyLegalName, 160) ?? agency.name,
    agencyRegNumber: cut(raw.agencyRegNumber, 60),
    agencyTerms: cut(raw.agencyTerms, 3000),
    clientTerms: cut(raw.clientTerms, 3000),
    client,
  };
  const [row] = await db
    .insert(ndas)
    .values({
      number,
      agencyId,
      locale: raw.locale === "en" ? "en" : "ar",
      direction: fields.direction,
      purpose,
      years: fields.years,
      jurisdiction: fields.legal.jurisdiction,
      jurisdictionCity: fields.legal.city,
      legalVersion: fields.legal.version,
      agencyLegalName: fields.agencyLegalName,
      agencyRegNumber: fields.agencyRegNumber,
      agencyTerms: fields.agencyTerms,
      clientTerms: fields.clientTerms,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email,
      clientRegNumber: client.regNumber,
      clientTokenHash: hashToken(token),
      clientTokenEnc: seal(token),
      termsHash: hashTerms(ndaCanonicalTerms(fields)),
      agencySignerName: signerName,
      agencySignedAt: new Date(),
      agencySignature: b64(raw.signature)!,
      agencySignIpHash: raw.signIp ? ipHash(raw.signIp) : null,
    })
    .returning();
  return { nda: row, token };
}

/** Recomputes the fingerprint from what is stored. */
export function ndaTermsHash(n: Nda) {
  return hashTerms(
    ndaCanonicalTerms({
      number: n.number,
      agencyId: n.agencyId,
      direction: n.direction,
      purpose: n.purpose,
      years: n.years,
      legal: { version: n.legalVersion, jurisdiction: n.jurisdiction, city: n.jurisdictionCity },
      agencyLegalName: n.agencyLegalName,
      agencyRegNumber: n.agencyRegNumber,
      agencyTerms: n.agencyTerms,
      clientTerms: n.clientTerms,
      client: { name: n.clientName, phone: n.clientPhone, email: n.clientEmail, regNumber: n.clientRegNumber },
    }),
  );
}

export type NdaView = { nda: Nda; agency: { id: string; name: string; handle: string } };

async function withAgency(n: Nda | undefined): Promise<NdaView | null> {
  if (!n) return null;
  const db = await getDb();
  const [agency] = await db.select({ id: agencies.id, name: agencies.name, handle: agencies.handle }).from(agencies).where(eq(agencies.id, n.agencyId));
  return agency ? { nda: n, agency } : null;
}

export async function getNdaByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const db = await getDb();
  const [n] = await db.select().from(ndas).where(eq(ndas.clientTokenHash, hashToken(token)));
  return withAgency(n);
}

export async function getNdaForAgency(agencyId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [n] = await db.select().from(ndas).where(and(eq(ndas.id, id), eq(ndas.agencyId, agencyId)));
  return withAgency(n);
}

export async function getNdaById(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [n] = await db.select().from(ndas).where(eq(ndas.id, id));
  return withAgency(n);
}

export async function listAgencyNdas(agencyId: string) {
  const db = await getDb();
  return db.select().from(ndas).where(eq(ndas.agencyId, agencyId)).orderBy(desc(ndas.createdAt)).limit(100);
}

export const ndaClientToken = (n: Nda) => tryOpen(n.clientTokenEnc);

type Result = { ok: true } | { error: string };

export async function signNda(token: string, signerName: string, ip: string, signature: Uint8Array | null): Promise<Result> {
  const v = await getNdaByToken(token);
  if (!v) return { error: "notFound" };
  if (v.nda.status !== "sent") return { error: "notSignable" };
  const name = signerName.trim().slice(0, 80);
  if (name.length < 3) return { error: "signer" };
  if (!signature?.length) return { error: "signature" };
  if (ndaTermsHash(v.nda) !== v.nda.termsHash) return { error: "tampered" };
  const db = await getDb();
  await db
    .update(ndas)
    .set({ status: "signed", clientSignerName: name, clientSignedAt: new Date(), clientSignature: b64(signature), clientSignIpHash: ipHash(ip), updatedAt: new Date() })
    .where(and(eq(ndas.id, v.nda.id), eq(ndas.status, "sent")));
  return { ok: true };
}

/** Client: decline, or ask for a change before signing (the agency then sends a new NDA). */
export async function answerNda(token: string, kind: "decline" | "amend", note: string): Promise<Result> {
  const v = await getNdaByToken(token);
  if (!v || v.nda.status !== "sent") return { error: "notSignable" };
  const text = note.trim().slice(0, 2000);
  if (kind === "amend" && text.length < 5) return { error: "note" };
  const db = await getDb();
  await db
    .update(ndas)
    .set({ clientNote: text || null, ...(kind === "decline" ? { status: "declined" } : {}), updatedAt: new Date() })
    .where(and(eq(ndas.id, v.nda.id), eq(ndas.status, "sent")));
  return { ok: true };
}

export async function cancelNda(agencyId: string, id: string): Promise<Result> {
  const db = await getDb();
  const rows = await db
    .update(ndas)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(ndas.id, id), eq(ndas.agencyId, agencyId), eq(ndas.status, "sent")))
    .returning({ id: ndas.id });
  return rows.length ? { ok: true } : { error: "locked" };
}
