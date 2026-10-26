// The bug agent's queue (docs/61). Reports and errors leave production only
// through the Bug queue workflow, encrypted to a key pair the agent creates for
// that one run: the workflow's logs and artifacts are public on this repository,
// the plaintext never is. Pure functions shared by lib/db/bug-queue.ts (the
// workflow side) and scripts/bug-agent/*.ts (the agent side).
import { constants, createCipheriv, createDecipheriv, createPrivateKey, createPublicKey, generateKeyPairSync, privateDecrypt, publicEncrypt, randomBytes } from "node:crypto";
import { z } from "zod";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Phone-like runs: an optional +, then 7 or more digits with spaces, dots, dashes or brackets between them.
const PHONE = /(?:\+|00)?\d[\d\s().-]{6,}\d/g;
const ARABIC_DIGITS = /[٠-٩]/g;

/** Removes email addresses and phone numbers before any text reaches the agent (CLAUDE.md: never send contact data to a model). */
export function redactContact(text: string): string {
  const western = text.replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660));
  return western.replace(EMAIL, "[email]").replace(PHONE, (m) => (m.replace(/\D/g, "").length >= 7 ? "[phone]" : m));
}

export type QueueReport = {
  id: string;
  ref: string;
  kind: "bug" | "complaint" | "question" | "suggestion";
  message: string;
  path: string | null;
  locale: string | null;
  viewport: string | null;
  appCommit: string | null;
  userAgent: string | null;
  reporterRole: string | null;
  wantsReply: boolean;
  createdAt: string;
  screenshots: { name: string; base64: string }[];
};
export type QueueError = {
  id: number;
  source: string;
  kind: string;
  message: string;
  stack: string | null;
  path: string | null;
  userAgent: string | null;
  occurrences: number;
  status: string;
  firstSeenAt: string;
  lastSeenAt: string;
};
export type QueueBundle = { exportedAt: string; reports: QueueReport[]; errors: QueueError[]; waitingOnOwner: number };

export type SealedBundle = { v: 1; key: string; iv: string; tag: string; data: string };

/** A fresh RSA key pair for one agent run. The public half (base64 SPKI DER) goes to the workflow as an input. */
export function newRunKeys() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 4096 });
  return {
    publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

export function seal(bundle: QueueBundle, publicKeyB64: string): SealedBundle {
  const publicKey = createPublicKey({ key: Buffer.from(publicKeyB64, "base64"), format: "der", type: "spki" });
  const aes = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aes, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(bundle), "utf8"), cipher.final()]);
  const key = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, aes);
  return { v: 1, key: key.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

export function open(sealed: SealedBundle, privateKeyPem: string): QueueBundle {
  const aes = privateDecrypt({ key: createPrivateKey(privateKeyPem), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(sealed.key, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", aes, Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(sealed.data, "base64")), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as QueueBundle;
}

/** What the agent may write back. Notes travel as public workflow inputs, so they describe the fix, never the reporter. */
export const queueUpdates = z
  .array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("report"),
        ref: z.string().regex(/^[A-F0-9]{8}$/),
        status: z.enum(["done", "planned", "declined"]),
        note: z.string().trim().min(3).max(600),
        commit: z.string().regex(/^[a-f0-9]{7,40}$/).optional(),
      }),
      z.object({
        type: z.literal("error"),
        id: z.number().int().positive(),
        status: z.enum(["investigating", "fixed", "wont_fix", "cannot_reproduce"]),
        note: z.string().trim().min(3).max(600),
        commit: z.string().regex(/^[a-f0-9]{7,40}$/).optional(),
      }),
    ]),
  )
  .max(50)
  .refine((list) => list.every((u) => !(u.status === "done" || u.status === "fixed") || !!u.commit), { message: "A fix needs its commit." });
export type QueueUpdate = z.infer<typeof queueUpdates>[number];
