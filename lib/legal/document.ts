import { createTranslator } from "next-intl";
import { citiesOf, countryName, countryOf } from "@/lib/countries";
import type { Contract, Nda } from "@/lib/db/schema";
import { lineLabel } from "@/lib/deliverables";
import { formatDate, formatFils } from "@/lib/format";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { COMMON_CLAUSES, DISCLAIMER, fill, LAW_CLAUSE, NDA_CLAUSES, SERVICE_CLAUSES, type Bi, type Clause } from "./clauses";
import type { DocBlock, DocSignature, LegalDocument } from "./document-types";
import { jurisdictionOf, LEGAL_VERSION } from "./jurisdictions";

/**
 * Builds the text of a contract or NDA once, for the page and the PDF alike,
 * so what is read on screen, printed and downloaded is the same document.
 * Contracts before terms v3 render with the wording they were signed with.
 */

type Lang = "ar" | "en";
const langOf = (locale: string): Lang => (locale === "en" ? "en" : "ar");
const pick = (b: Bi, l: Lang) => b[l];
const day = (d: string, locale: string) => formatDate(new Date(`${d}T12:00:00Z`), locale);
export const cityName = (key: string | null | undefined, country: string | null | undefined, l: Lang) => {
  const c = citiesOf(country).find((x) => x.key === key);
  return c ? c[l] : (key ?? "");
};

const L = {
  contractTitle: { ar: "عقد تقديم خدمات تسويقية", en: "Marketing services contract" },
  ndaTitle: { ar: "اتفاقية عدم إفصاح وسرية", en: "Non-disclosure agreement" },
  parties: { ar: "الأطراف", en: "The parties" },
  agencyRole: { ar: "الطرف الأول (الوكالة)", en: "First party (the Agency)" },
  clientRole: { ar: "الطرف الثاني (العميل)", en: "Second party (the Client)" },
  reg: { ar: "رقم السجل التجاري / الهوية", en: "Commercial registration / ID no." },
  seat: { ar: "المقر", en: "Based in" },
  onSawwiq: { ar: "على سوّق", en: "on Sawwiq" },
  phone: { ar: "الهاتف", en: "Phone" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  scope: { ar: "موضوع العقد ونطاق العمل", en: "Subject and scope of work" },
  noItems: { ar: "كما هو مبيّن في المراحل أدناه.", en: "As set out in the milestones below." },
  period: { ar: "المدة", en: "Term" },
  periodBody: { ar: "يبدأ العمل في {start} وينتهي في {end}.", en: "Work runs from {start} to {end}." },
  milestones: { ar: "المراحل والتسليمات والمبالغ", en: "Milestones, deliverables and amounts" },
  total: { ar: "إجمالي قيمة العقد: {amount}", en: "Total contract value: {amount}" },
  payment: { ar: "الدفع المضمون", en: "Guaranteed payment" },
  paymentBody: {
    ar: "كل عقد على سوّق مضمون الدفع والتسليم: يدفع العميل مبلغ كل مرحلة قبل بدء العمل عليها إلى طرف ثالث موثوق يحفظه، ويُحرَّر للوكالة بعد أن يؤكد العميل كل بنود المرحلة. رسوم خدمة الضمان {fee}٪ من كل مبلغ محرَّر تُخصم قبل التحويل إلى الوكالة.",
    en: "Every contract on Sawwiq guarantees payment and delivery: the client pays each milestone, before work on it starts, to a trusted third party that holds it, and it is released to the agency once the client confirms every item of the milestone. The guarantee fee is {fee}% of each released amount, deducted before it is paid to the agency.",
  },
  results: { ar: "الأهداف والتقارير", en: "Targets and reporting" },
  kpisBody: { ar: "تعمل الوكالة نحو الأهداف التالية وتعرض أرقامها في تقاريرها:", en: "The agency works towards these targets and reports the numbers:" },
  reporting: { ar: "تقرير {cadence} على المنصة: ما أُنجز، والأرقام مقابل الأهداف، والخطوات التالية.", en: "A {cadence} report on the platform: what was done, the numbers against the targets, and next steps." },
  media: {
    ar: "ميزانية الإعلانات التقديرية {amount} شهريًا، يدفعها العميل مباشرة لمنصات الإعلان من حسابه، ولا تدخل في أتعاب الوكالة ولا تضيف عليها الوكالة أي عمولة.",
    en: "The estimated ad budget is {amount} a month, paid by the client directly to the ad platforms from its own account; it is not part of the agency's fee and the agency adds no commission to it.",
  },
  clientSpecial: { ar: "طلبات العميل الخاصة", en: "The client's special requests" },
  clientSpecialBody: { ar: "الطلبات المعلّمة بـ ★ جزء من قائمة بنود المرحلة المذكورة، ولا تُقبل المرحلة دونها.", en: "Requests marked ★ are part of the checklist of the milestone shown; the milestone can't be accepted without them." },
  agencySpecial: { ar: "شروط الوكالة الخاصة", en: "The agency's special conditions" },
  general: { ar: "الشروط العامة", en: "General conditions" },
  confidentiality: { ar: "السرية", en: "Confidentiality" },
  ndaInContract: {
    ar: "يلتزم الطرفان بالسرية تجاه ما يفصح عنه كل منهما للآخر بشأن هذا العقد (سرية متبادلة)، وفق البنود التالية.",
    en: "Both parties keep confidential what each shares with the other in connection with this contract (mutual confidentiality), on the terms below.",
  },
  ndaExtra: { ar: "شروط سرية إضافية", en: "Additional confidentiality terms" },
  annex: { ar: "ملحق القانون الواجب التطبيق — {country}", en: "Governing-law annex — {country}" },
  eSign: { ar: "التوقيع والمعاملات الإلكترونية", en: "Electronic signatures and transactions" },
  data: { ar: "حماية البيانات الشخصية", en: "Personal data protection" },
  copyright: { ar: "حق المؤلف", en: "Copyright" },
  vat: { ar: "ضريبة القيمة المضافة / المبيعات: {rate}", en: "VAT / sales tax: {rate}" },
  noVat: { ar: "لا توجد", en: "none" },
  purpose: { ar: "الغرض", en: "Purpose" },
  direction: { ar: "نوع الاتفاقية", en: "Type of agreement" },
  directions: {
    mutual: { ar: "متبادلة: يفصح كل طرف للآخر ويلتزم كلاهما بالسرية.", en: "Mutual: each party discloses to the other and both keep it confidential." },
    client_discloses: { ar: "من طرف واحد: يفصح العميل وتلتزم الوكالة بالسرية.", en: "One-way: the client discloses and the agency keeps it confidential." },
    agency_discloses: { ar: "من طرف واحد: تفصح الوكالة ويلتزم العميل بالسرية.", en: "One-way: the agency discloses and the client keeps it confidential." },
  } as Record<string, Bi>,
  years: { ar: "{n} سنة", en: "{n} years" },
  yearsOne: { ar: "سنة واحدة", en: "one year" },
  yearsTwo: { ar: "سنتين", en: "two years" },
  vatText: {
    ar: "الأسعار لا تشمل ضريبة القيمة المضافة أو المبيعات ({rate}٪) ما لم يُذكر غير ذلك.",
    en: "Prices exclude VAT or sales tax ({rate}%) unless stated otherwise.",
  },
  noVatText: { ar: "لا تُفرض ضريبة قيمة مضافة في دولة الوكالة حتى تاريخه.", en: "There is no VAT in the agency's country at this date." },
  evidenceTitle: { ar: "سجلّ التوقيع الإلكتروني", en: "Electronic signature record" },
  signedAt: { ar: "وقت التوقيع", en: "Signed at" },
  notSigned: { ar: "لم يُوقَّع بعد", en: "Not signed yet" },
  fingerprint: { ar: "البصمة الرقمية للشروط (SHA-256)", en: "Terms fingerprint (SHA-256)" },
  ipHash: { ar: "بصمة عنوان الشبكة", en: "Network address hash" },
  page: { ar: "صفحة", en: "Page" },
  evidenceNote: {
    ar: "وقّع كل طرف باسمه الكامل وتوقيعه المرسوم بعد موافقته الصريحة على التعاقد إلكترونيًا. البصمة الرقمية محسوبة من نص الشروط الموقّعة كما حُفظ؛ أي تغيير فيها يغيّر البصمة. النسختان العربية والإنجليزية من هذا المستند تحملان البصمة نفسها، والنص العربي هو المعتمد.",
    en: "Each party signed with its full name and a drawn signature after expressly agreeing to contract electronically. The fingerprint is computed from the signed terms as stored; any change to them changes it. The Arabic and English versions of this document carry the same fingerprint, and the Arabic text prevails.",
  },
  agency: { ar: "الوكالة", en: "Agency" },
  client: { ar: "العميل", en: "Client" },
} satisfies Record<string, Bi | Record<string, Bi>>;

const yearsText = (n: number, l: Lang) => (n === 1 ? L.yearsOne[l] : n === 2 ? L.yearsTwo[l] : fill(L.years[l], { n }));

function clauseBlocks(clauses: Clause[], l: Lang, vars: Record<string, string | number>, start: number): DocBlock[] {
  return clauses.map((c, i) => ({ heading: `${start + i}. ${pick(c.title, l)}`, paragraphs: c.body.map((b) => fill(pick(b, l), vars)) }));
}

type LegalBasis = { jurisdiction: string; jurisdictionCity: string; legalVersion: string | null };

function lawVars(b: LegalBasis, l: Lang, extra: Record<string, string | number> = {}) {
  const j = jurisdictionOf(b.jurisdiction);
  return {
    country: countryName(j.code, l),
    city: cityName(b.jurisdictionCity, j.code, l),
    eSignLaw: pick(j.eSignLaw, l),
    dataLaw: pick(j.dataLaw, l),
    copyrightLaw: pick(j.copyrightLaw, l),
    vat: j.vatPercent ? fill(L.vatText[l], { rate: j.vatPercent }) : L.noVatText[l],
    ...extra,
  };
}

function annexBlock(b: LegalBasis, l: Lang): DocBlock {
  const j = jurisdictionOf(b.jurisdiction);
  return {
    heading: fill(L.annex[l], { country: countryName(j.code, l) }),
    bullets: [
      `${L.eSign[l]}: ${pick(j.eSignLaw, l)}`,
      `${L.data[l]}: ${pick(j.dataLaw, l)}`,
      `${L.copyright[l]}: ${pick(j.copyrightLaw, l)}`,
      fill(L.vat[l], { rate: j.vatPercent ? `${j.vatPercent}%` : L.noVat[l] }),
      ...j.notes.map((n) => pick(n, l)),
    ],
  };
}

const labels = (l: Lang): LegalDocument["labels"] => ({
  page: L.page[l],
  evidenceTitle: L.evidenceTitle[l],
  signedAt: L.signedAt[l],
  notSigned: L.notSigned[l],
  fingerprint: L.fingerprint[l],
  ipHash: L.ipHash[l],
  evidenceNote: L.evidenceNote[l],
});

const image = (b64: string | null | undefined) => (b64 ? new Uint8Array(Buffer.from(b64, "base64")) : null);

function partyLines(o: { name: string; legalName?: string | null; reg?: string | null; seat?: string | null; handle?: string | null; phone?: string | null; email?: string | null }, l: Lang) {
  const title = o.legalName && o.legalName !== o.name ? `${o.legalName} (${o.name})` : o.name;
  return {
    title,
    lines: [
      o.handle ? `@${o.handle} ${L.onSawwiq[l]}` : "",
      o.reg ? `${L.reg[l]}: ${o.reg}` : "",
      o.seat ? `${L.seat[l]}: ${o.seat}` : "",
      o.phone ? `${L.phone[l]}: ${o.phone}` : "",
      o.email ? `${L.email[l]}: ${o.email}` : "",
    ].filter(Boolean),
  };
}

// ── Contracts ─────────────────────────────────────────────────────────────

export type ContractForDoc = {
  contract: Contract;
  agency: { name: string; handle: string };
  milestones: { id: string; title: string; dueDate: string; amountFils: number; checks: { text: string; source: string }[] }[];
  /** Milestones added later by accepted change requests (shown, but not part of the signed terms). */
  addedMilestoneIds?: Set<string>;
};

export function contractDocument(v: ContractForDoc, locale: string): LegalDocument {
  const l = langOf(locale);
  const c = v.contract;
  const messages = l === "ar" ? ar : en;
  const td = createTranslator({ locale: l, messages, namespace: "Deliverables" });
  const tp = createTranslator({ locale: l, messages, namespace: "Platforms" });
  const tc = createTranslator({ locale: l, messages, namespace: "Contracts.commit" });
  const money = (f: number) => formatFils(f, l, c.currency);
  const v3 = c.termsVersion >= 3 && c.jurisdiction;
  const blocks: DocBlock[] = [];
  const specials = v.milestones.flatMap((m) => m.checks.filter((k) => k.source === "special_request").map((k) => `★ ${k.text} (${m.title})`));

  if (!v3) return legacyContract(v, l);

  const basis = { jurisdiction: c.jurisdiction!, jurisdictionCity: c.jurisdictionCity ?? "", legalVersion: c.legalVersion };
  const vars = lawVars(basis, l, { fee: c.feePercent, years: yearsText(c.ndaYears ?? 2, l) });
  const agencySeat = `${cityName(c.jurisdictionCity, c.jurisdiction, l)}، ${countryName(c.jurisdiction!, l)}`.replace("، ", l === "ar" ? "، " : ", ");
  const agencyP = partyLines({ name: v.agency.name, legalName: c.agencyLegalName, reg: c.agencyRegNumber, seat: agencySeat, handle: v.agency.handle }, l);
  const clientP = partyLines({ name: c.clientName, reg: c.clientRegNumber, phone: c.clientPhone, email: c.clientEmail }, l);

  blocks.push({
    heading: `1. ${L.parties[l]}`,
    numbered: [
      { title: `${L.agencyRole[l]}: ${agencyP.title}`, lines: agencyP.lines },
      { title: `${L.clientRole[l]}: ${clientP.title}`, lines: clientP.lines },
    ],
  });
  blocks.push({
    heading: `2. ${L.scope[l]}`,
    paragraphs: [c.summary].filter(Boolean),
    ...(c.items.length ? { bullets: c.items.map((line) => lineLabel(line, (k, vals) => td(k as "add", vals as never), (p) => tp(p as "instagram"))) } : { paragraphs: [c.summary, L.noItems[l]].filter(Boolean) }),
  });
  blocks.push({ heading: `3. ${L.period[l]}`, paragraphs: [fill(L.periodBody[l], { start: day(c.startDate, l), end: day(c.endDate, l) })] });
  const signedMs = v.milestones.filter((m) => !v.addedMilestoneIds?.has(m.id));
  blocks.push({
    heading: `4. ${L.milestones[l]}`,
    numbered: signedMs.map((m) => ({
      title: m.title,
      detail: `${money(m.amountFils)} · ${day(m.dueDate, l)}`,
      lines: m.checks.map((k) => `${k.source === "special_request" ? "★ " : ""}${k.text}`),
    })),
    paragraphs: [fill(L.total[l], { amount: money(signedMs.reduce((s, m) => s + m.amountFils, 0)) })],
  });
  blocks.push({ heading: `5. ${L.payment[l]}`, paragraphs: [fill(L.paymentBody[l], { fee: c.feePercent })] });

  let n = 6;
  const results: string[] = [];
  if (c.kpis.length || c.reportingCadence || c.mediaBudgetJod) {
    const paragraphs = [
      ...(c.kpis.length ? [L.kpisBody[l]] : []),
      ...(c.reportingCadence ? [fill(L.reporting[l], { cadence: tc(`cadence.${c.reportingCadence as "weekly"}`) })] : []),
      ...(c.mediaBudgetJod ? [fill(L.media[l], { amount: money(c.mediaBudgetJod * 1000) })] : []),
    ];
    results.push(...c.kpis.map((k) => `${k.label}: ${k.target}`));
    blocks.push({ heading: `${n++}. ${L.results[l]}`, paragraphs, bullets: results.length ? results : undefined });
  }
  if (specials.length || c.clientTerms) {
    blocks.push({
      heading: `${n++}. ${L.clientSpecial[l]}`,
      paragraphs: [...(specials.length ? [L.clientSpecialBody[l]] : []), ...(c.clientTerms ? [c.clientTerms] : [])],
      bullets: specials.length ? specials : undefined,
    });
  }
  if (c.agencyTerms) blocks.push({ heading: `${n++}. ${L.agencySpecial[l]}`, paragraphs: [c.agencyTerms] });

  blocks.push({ heading: `${n++}. ${L.general[l]}`, paragraphs: [] });
  const general = clauseBlocks(SERVICE_CLAUSES, l, vars, 1);
  if (c.nda) {
    general.push({
      heading: `${general.length + 1}. ${L.confidentiality[l]}`,
      paragraphs: [L.ndaInContract[l], ...NDA_CLAUSES.filter((x) => x.id !== "nda_entire" && x.id !== "no_licence").flatMap((x) => [`${pick(x.title, l)}: ${x.body.map((b) => fill(pick(b, l), vars)).join(" ")}`]), ...(c.ndaExtra ? [`${L.ndaExtra[l]}: ${c.ndaExtra}`] : [])],
    });
  }
  general.push(...clauseBlocks([...COMMON_CLAUSES, LAW_CLAUSE], l, vars, general.length + 1));
  blocks.push(...general.map((b) => ({ ...b, heading: `${n - 1}.${b.heading}` })));
  blocks.push(annexBlock(basis, l));
  blocks.push({ heading: "", paragraphs: [fill(DISCLAIMER[l], { version: c.legalVersion ?? LEGAL_VERSION })] });

  return {
    kind: "contract",
    locale: l,
    dir: l === "ar" ? "rtl" : "ltr",
    title: L.contractTitle[l],
    number: c.number,
    subtitle: c.title,
    blocks,
    signatures: contractSignatures(v, l),
    fingerprint: c.termsHash,
    timeZone: countryOf(c.jurisdiction).timeZones[0],
    labels: labels(l),
  };
}

function contractSignatures(v: ContractForDoc, l: Lang): DocSignature[] {
  const c = v.contract;
  return [
    { role: L.agency[l], party: c.agencyLegalName || v.agency.name, signerName: c.agencySignerName, signedAt: c.agencySignedAt, image: image(c.agencySignature), ipHash: c.agencySignIpHash },
    { role: L.client[l], party: c.clientName, signerName: c.clientSignedAt ? c.clientSignerName : null, signedAt: c.clientSignedAt, image: image(c.clientSignature), ipHash: c.clientSignIpHash },
  ];
}

/** Contracts signed before the universal conditions (terms v1/v2): the wording they were signed with. */
function legacyContract(v: ContractForDoc, l: Lang): LegalDocument {
  const c = v.contract;
  const messages = l === "ar" ? ar : en;
  const t = createTranslator({ locale: l, messages, namespace: "Contracts.doc" });
  const td = createTranslator({ locale: l, messages, namespace: "Deliverables" });
  const tp = createTranslator({ locale: l, messages, namespace: "Platforms" });
  const tc = createTranslator({ locale: l, messages, namespace: "Contracts.commit" });
  const money = (f: number) => formatFils(f, l, c.currency);
  const specials = v.milestones.flatMap((m) => m.checks.filter((k) => k.source === "special_request").map((k) => `★ ${k.text} (${m.title})`));
  const blocks: DocBlock[] = [
    { heading: t("parties"), paragraphs: [t("partiesBody", { agency: v.agency.name, handle: v.agency.handle, client: c.clientName, phone: c.clientPhone })] },
    c.items.length
      ? { heading: t("scope"), bullets: c.items.map((line) => lineLabel(line, (k, vals) => td(k as "add", vals as never), (p) => tp(p as "instagram"))) }
      : { heading: t("scope"), paragraphs: [t("noItems")] },
    { heading: t("period"), paragraphs: [t("periodBody", { start: day(c.startDate, l), end: day(c.endDate, l) })] },
    {
      heading: t("milestones"),
      numbered: v.milestones.map((m) => ({ title: m.title, detail: `${money(m.amountFils)} · ${day(m.dueDate, l)}`, lines: m.checks.map((k) => `${k.source === "special_request" ? "★ " : ""}${k.text}`) })),
      paragraphs: [money(c.totalFils)],
    },
    ...(specials.length ? [{ heading: t("specials"), paragraphs: [t("specialsBody")], bullets: specials }] : []),
    { heading: t("payment"), paragraphs: [c.paymentMode === "protected" ? t("paymentProtected", { fee: c.feePercent }) : t("paymentDirect")] },
  ];
  if (c.termsVersion >= 2) {
    if (c.kpis.length) blocks.push({ heading: t("kpis"), paragraphs: [t("kpisBody")], bullets: c.kpis.map((k) => `${k.label}: ${k.target}`) });
    if (c.reportingCadence) blocks.push({ heading: t("reporting"), paragraphs: [t("reportingBody", { cadence: tc(`cadence.${c.reportingCadence as "weekly"}`) })] });
    if (c.mediaBudgetJod) blocks.push({ heading: t("media"), paragraphs: [t("mediaBody", { amount: money(c.mediaBudgetJod * 1000) })] });
    blocks.push({ heading: t("ownership"), paragraphs: [t("ownershipBody")] }, { heading: t("noSurprises"), paragraphs: [t("noSurprisesBody")] });
  }
  blocks.push({ heading: t("changes"), paragraphs: [t("changesBody")] });
  if (c.nda) blocks.push({ heading: t("nda"), paragraphs: [t("ndaBody"), ...(c.ndaExtra ? [t("ndaExtra", { text: c.ndaExtra })] : [])] });
  blocks.push({ heading: t("general"), paragraphs: [t("generalBody")] }, { heading: "", paragraphs: [t("disclaimer")] });
  return {
    kind: "contract",
    locale: l,
    dir: l === "ar" ? "rtl" : "ltr",
    title: t("title"),
    number: c.number,
    subtitle: c.title,
    blocks,
    signatures: contractSignatures(v, l),
    fingerprint: c.termsHash,
    timeZone: "Asia/Amman",
    labels: labels(l),
  };
}

// ── NDAs ──────────────────────────────────────────────────────────────────

export function ndaDocument(n: Nda, agency: { name: string; handle: string }, locale: string): LegalDocument {
  const l = langOf(locale);
  const basis = { jurisdiction: n.jurisdiction, jurisdictionCity: n.jurisdictionCity, legalVersion: n.legalVersion };
  const vars = lawVars(basis, l, { years: yearsText(n.years, l) });
  const seat = [cityName(n.jurisdictionCity, n.jurisdiction, l), countryName(n.jurisdiction, l)].join(l === "ar" ? "، " : ", ");
  const agencyP = partyLines({ name: agency.name, legalName: n.agencyLegalName, reg: n.agencyRegNumber, seat, handle: agency.handle }, l);
  const clientP = partyLines({ name: n.clientName, reg: n.clientRegNumber, phone: n.clientPhone, email: n.clientEmail }, l);
  const blocks: DocBlock[] = [
    {
      heading: `1. ${L.parties[l]}`,
      numbered: [
        { title: `${L.agencyRole[l]}: ${agencyP.title}`, lines: agencyP.lines },
        { title: `${L.clientRole[l]}: ${clientP.title}`, lines: clientP.lines },
      ],
    },
    { heading: `2. ${L.purpose[l]}`, paragraphs: [n.purpose] },
    { heading: `3. ${L.direction[l]}`, paragraphs: [pick(L.directions[n.direction] ?? L.directions.mutual, l)] },
  ];
  let k = 4;
  if (n.clientTerms) blocks.push({ heading: `${k++}. ${L.clientSpecial[l]}`, paragraphs: [n.clientTerms] });
  if (n.agencyTerms) blocks.push({ heading: `${k++}. ${L.agencySpecial[l]}`, paragraphs: [n.agencyTerms] });
  blocks.push(...clauseBlocks([...NDA_CLAUSES, ...COMMON_CLAUSES, LAW_CLAUSE], l, vars, k));
  blocks.push(annexBlock(basis, l));
  blocks.push({ heading: "", paragraphs: [fill(DISCLAIMER[l], { version: n.legalVersion })] });
  return {
    kind: "nda",
    locale: l,
    dir: l === "ar" ? "rtl" : "ltr",
    title: L.ndaTitle[l],
    number: n.number,
    subtitle: n.purpose.length > 90 ? `${n.purpose.slice(0, 88)}…` : n.purpose,
    blocks,
    signatures: [
      { role: L.agency[l], party: n.agencyLegalName, signerName: n.agencySignerName, signedAt: n.agencySignedAt, image: image(n.agencySignature), ipHash: n.agencySignIpHash },
      { role: L.client[l], party: n.clientName, signerName: n.clientSignedAt ? n.clientSignerName : null, signedAt: n.clientSignedAt, image: image(n.clientSignature), ipHash: n.clientSignIpHash },
    ],
    fingerprint: n.termsHash,
    timeZone: countryOf(n.jurisdiction).timeZones[0],
    labels: labels(l),
  };
}
