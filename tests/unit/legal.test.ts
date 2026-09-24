import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COUNTRY_CODES } from "@/lib/countries";
import { createAgency, updateAgency } from "@/lib/data/agencies";
import { clientSign, createContract, getContractByToken, type ContractInput } from "@/lib/data/contracts";
import { answerNda, createNda, getNdaByToken, ndaTermsHash, signNda, type NdaInput } from "@/lib/data/ndas";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { ndas } from "@/lib/db/schema";
import { COMMON_CLAUSES, LAW_CLAUSE, NDA_CLAUSES, SERVICE_CLAUSES } from "@/lib/legal/clauses";
import { contractDocument, ndaDocument } from "@/lib/legal/document";
import { JURISDICTIONS, jurisdictionOf } from "@/lib/legal/jurisdictions";
import { renderLegalPdf } from "@/lib/pdf/legal-pdf";
import { SIGNATURE_PNG } from "./png";

let riyadh: string;
let amman: string;
beforeAll(async () => {
  const u = await createUser("legal-sa@t.sa", "password-1234");
  riyadh = (await createAgency(u.id, { handle: "legal.riyadh", name: "Riyadh Studio", city: "riyadh", services: ["smm_management"] })).id;
  await updateAgency(riyadh, { country: "sa" } as never);
  const u2 = await createUser("legal-jo@t.jo", "password-1234");
  amman = (await createAgency(u2.id, { handle: "legal.amman", name: "Amman Studio", city: "amman", services: ["smm_management"] })).id;
});
afterAll(() => closeDb());

const text = (d: ReturnType<typeof contractDocument>) => d.blocks.flatMap((b) => [b.heading, ...(b.paragraphs ?? []), ...(b.bullets ?? []), ...(b.numbered ?? []).flatMap((n) => [n.title, ...(n.lines ?? [])])]).join("\n");

describe("universal clauses", () => {
  it("cover every country the platform serves, in both languages", () => {
    expect(JURISDICTIONS.map((j) => j.code)).toEqual([...COUNTRY_CODES]);
    for (const j of JURISDICTIONS) {
      for (const b of [j.eSignLaw, j.dataLaw, j.copyrightLaw, ...j.notes]) {
        expect(b.ar.length).toBeGreaterThan(10);
        expect(b.en.length).toBeGreaterThan(10);
      }
    }
    for (const c of [...SERVICE_CLAUSES, ...NDA_CLAUSES, ...COMMON_CLAUSES, LAW_CLAUSE]) {
      expect(c.title.ar && c.title.en).toBeTruthy();
      for (const b of c.body) expect(b.ar.length && b.en.length).toBeTruthy();
    }
    expect(jurisdictionOf("xx").code).toBe("jo");
    expect(jurisdictionOf("sa").vatPercent).toBe(15);
    expect(jurisdictionOf("kw").vatPercent).toBe(0);
  });

  it("carry no interest or penalty on the client, and say Arabic prevails", () => {
    const all = [...SERVICE_CLAUSES, LAW_CLAUSE].flatMap((c) => c.body.map((b) => b.en)).join(" ");
    expect(all).toMatch(/no late-payment penalty or interest/);
    expect(all).toMatch(/the Arabic text prevails/);
  });
});

const draft = (over: Partial<ContractInput> = {}): ContractInput => ({
  title: "Snapchat for a Riyadh café",
  summary: "Content and Snapchat ads.",
  items: [],
  specialRequests: [{ text: "Owner approves every post", milestone: 0 }],
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  paymentMode: "protected",
  nda: true,
  ndaYears: 3,
  client: { name: "Faisal", phone: "+966500000001", email: null },
  clientRegNumber: "1010123456",
  agencyLegalName: "Riyadh Studio Co.",
  agencyRegNumber: "7001234567",
  agencyTerms: "Two rounds of revisions per design.",
  clientTerms: "No work for competing cafés in Riyadh during the contract.",
  milestones: [{ title: "October", dueDate: "2026-10-31", amountFils: 3_500_000, checks: ["12 snaps a week"] }],
  signerName: "Reem Alharbi",
  signature: SIGNATURE_PNG,
  locale: "ar",
  ...over,
});

describe("contract under Saudi law", () => {
  it("names the Saudi laws and courts, both parties' identity and both sides' special conditions", async () => {
    const created = await createContract(riyadh, draft());
    if (!("token" in created)) throw new Error(created.error);
    expect(created.contract).toMatchObject({ jurisdiction: "sa", jurisdictionCity: "riyadh", currency: "SAR", ndaYears: 3 });
    await clientSign(created.token, "Faisal Alqahtani", "9.9.9.9", SIGNATURE_PNG);
    const v = (await getContractByToken(created.token))!;
    const en = text(contractDocument(v, "en"));
    expect(en).toMatch(/Royal Decree No\. M\/18/);
    expect(en).toMatch(/Personal Data Protection Law, Royal Decree No\. M\/19/);
    expect(en).toMatch(/competent courts of Riyadh, Saudi Arabia/);
    expect(en).toMatch(/Riyadh Studio Co\./);
    expect(en).toMatch(/7001234567/);
    expect(en).toMatch(/Two rounds of revisions/);
    expect(en).toMatch(/No work for competing cafés/);
    expect(en).toMatch(/★ Owner approves every post/);
    expect(en).toMatch(/3 years after/);
    expect(en).toMatch(/10% of each released payment/);
    const ar = contractDocument(v, "ar");
    expect(ar.dir).toBe("rtl");
    expect(ar.timeZone).toBe("Asia/Riyadh");
    expect(text(ar)).toMatch(/نظام التعاملات الإلكترونية/);
    expect(ar.signatures.every((s) => s.signedAt && s.image?.length)).toBe(true);
    const pdf = await renderLegalPdf(ar);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.LEGAL_PDF_SAMPLE) (await import("node:fs")).writeFileSync(process.env.LEGAL_PDF_SAMPLE, pdf);
  });

  it("keeps the Jordanian law for a Jordanian agency", async () => {
    const created = await createContract(amman, draft({ client: { name: "Nour", phone: "+962790000009" } }));
    if (!("token" in created)) throw new Error(created.error);
    const en = text(contractDocument((await getContractByToken(created.token))!, "en"));
    expect(en).toMatch(/Electronic Transactions Law No\. 15 of 2015/);
    expect(en).toMatch(/courts of Amman, Jordan/);
  });
});

const nda = (over: Partial<NdaInput> = {}): NdaInput => ({
  direction: "client_discloses",
  purpose: "Discussing a launch plan for a new café chain",
  years: 2,
  agencyLegalName: "Riyadh Studio Co.",
  agencyTerms: null,
  clientTerms: "Credentials are shared only through a password manager.",
  client: { name: "Faisal", phone: "+966500000001", email: null, regNumber: null },
  signerName: "Reem Alharbi",
  signature: SIGNATURE_PNG,
  signIp: "1.1.1.1",
  locale: "ar",
  ...over,
});

describe("standalone NDA", () => {
  it("validates, signs on both sides and freezes the signatures", async () => {
    expect(await createNda(riyadh, nda({ purpose: "short" }))).toEqual({ error: "purpose" });
    expect(await createNda(riyadh, nda({ signature: null }))).toEqual({ error: "signature" });
    const created = await createNda(riyadh, nda());
    if (!("token" in created)) throw new Error(created.error);
    expect(ndaTermsHash(created.nda)).toBe(created.nda.termsHash);
    expect(await signNda(created.token, "Faisal Alqahtani", "2.2.2.2", null)).toEqual({ error: "signature" });
    expect(await signNda(created.token, "Faisal Alqahtani", "2.2.2.2", SIGNATURE_PNG)).toEqual({ ok: true });
    expect(await signNda(created.token, "Faisal Alqahtani", "2.2.2.2", SIGNATURE_PNG)).toEqual({ error: "notSignable" });
    const v = (await getNdaByToken(created.token))!;
    expect(v.nda.status).toBe("signed");
    const doc = ndaDocument(v.nda, v.agency, "en");
    expect(doc.kind).toBe("nda");
    const all = text(doc as never);
    expect(all).toMatch(/One-way: the client discloses/);
    expect(all).toMatch(/password manager/);
    expect(all).toMatch(/two years after/);
    const db = await getDb();
    await expect(db.update(ndas).set({ clientSignerName: "Someone else" }).where(eq(ndas.id, v.nda.id))).rejects.toThrow();
  });

  it("refuses to sign terms changed after the agency signed", async () => {
    const created = await createNda(riyadh, nda());
    if (!("token" in created)) throw new Error(created.error);
    await (await getDb()).update(ndas).set({ purpose: "Something else entirely" }).where(eq(ndas.id, created.nda.id));
    expect(await signNda(created.token, "Faisal Alqahtani", "2.2.2.2", SIGNATURE_PNG)).toEqual({ error: "tampered" });
  });

  it("lets the client ask for a change or decline", async () => {
    const created = await createNda(riyadh, nda());
    if (!("token" in created)) throw new Error(created.error);
    expect(await answerNda(created.token, "amend", "no")).toEqual({ error: "note" });
    expect(await answerNda(created.token, "amend", "Make it mutual please")).toEqual({ ok: true });
    expect((await getNdaByToken(created.token))!.nda).toMatchObject({ status: "sent", clientNote: "Make it mutual please" });
    expect(await answerNda(created.token, "decline", "")).toEqual({ ok: true });
    expect((await getNdaByToken(created.token))!.nda.status).toBe("declined");
  });
});
