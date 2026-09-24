"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { NDA_YEARS } from "@/lib/data/contracts";
import { answerNda, cancelNda, createNda, NDA_DIRECTIONS, signNda } from "@/lib/data/ndas";
import { parseSignatureDataUrl } from "@/lib/pdf/signature-image";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export type NdaActionState = { error?: string; ok?: boolean } | undefined;
const refresh = () => revalidatePath("/[locale]", "layout");

const ndaSchema = z.object({
  direction: z.enum(NDA_DIRECTIONS),
  purpose: z.string().max(1000),
  years: z.coerce.number().int().refine((n) => (NDA_YEARS as readonly number[]).includes(n)),
  agencyLegalName: z.string().max(160).optional(),
  agencyRegNumber: z.string().max(60).optional(),
  agencyTerms: z.string().max(3000).optional(),
  clientTerms: z.string().max(3000).optional(),
  clientName: z.string().max(80),
  clientPhone: z.string().max(20),
  clientEmail: z.union([z.literal(""), z.string().email().max(200)]).optional(),
  clientRegNumber: z.string().max(60).optional(),
  signer: z.string().max(80),
});

export async function createNdaAction(_: NdaActionState, formData: FormData): Promise<NdaActionState> {
  const { agency } = await requireAgency();
  const locale = await getLocale();
  if (!rateLimit(`nda:${agency.id}`, 20, 60 * 60 * 1000)) return { error: "rateLimited" };
  if (formData.get("agree") !== "on") return { error: "agree" };
  const parsed = ndaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.path[0] === "clientEmail" ? "client" : "invalid" };
  const d = parsed.data;
  const r = await createNda(agency.id, {
    direction: d.direction,
    purpose: d.purpose,
    years: d.years,
    agencyLegalName: d.agencyLegalName,
    agencyRegNumber: d.agencyRegNumber,
    agencyTerms: d.agencyTerms,
    clientTerms: d.clientTerms,
    client: { name: d.clientName, phone: d.clientPhone, email: d.clientEmail || null, regNumber: d.clientRegNumber },
    signerName: d.signer,
    signature: parseSignatureDataUrl(formData.get("signature")),
    signIp: await clientIp(),
    locale,
  });
  if ("error" in r) return { error: r.error };
  refresh();
  return redirect({ href: `/studio/ndas/${r.nda.id}?sent=1`, locale });
}

export async function cancelNdaAction(formData: FormData) {
  const { agency } = await requireAgency();
  await cancelNda(agency.id, String(formData.get("ndaId") ?? ""));
  refresh();
}

export async function signNdaAction(_: NdaActionState, formData: FormData): Promise<NdaActionState> {
  const ip = await clientIp();
  if (!rateLimit(`sign:${ip}`, 10, 10 * 60 * 1000)) return { error: "rateLimited" };
  if (formData.get("agree") !== "on") return { error: "agree" };
  const r = await signNda(String(formData.get("token") ?? ""), String(formData.get("signer") ?? ""), ip, parseSignatureDataUrl(formData.get("signature")));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

export async function answerNdaAction(_: NdaActionState, formData: FormData): Promise<NdaActionState> {
  if (!rateLimit(`nda-answer:${await clientIp()}`, 20, 10 * 60 * 1000)) return { error: "rateLimited" };
  const kind = formData.get("kind") === "decline" ? "decline" : "amend";
  const r = await answerNda(String(formData.get("token") ?? ""), kind, String(formData.get("note") ?? ""));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}
