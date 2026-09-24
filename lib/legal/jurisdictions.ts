import { COUNTRY_CODES, countryOf, type CountryCode } from "@/lib/countries";

/**
 * The law each Sawwiq contract and NDA is written against, per country.
 *
 * Governing law is the agency's country (where the service is performed and
 * the agency is licensed); the client keeps any protection its own country's
 * law makes mandatory. The references below are what the clauses rely on:
 * electronic signatures and records, personal data, copyright (who owns the
 * work) and the sales tax / VAT rate the price is quoted against.
 *
 * Not legal advice: each country's annex must be reviewed by a lawyer
 * licensed there before launch in that country (docs/22-legal-documents.md).
 */

type Bi = { ar: string; en: string };

export type Jurisdiction = {
  code: CountryCode;
  /** Electronic transactions / signatures law that makes the e-signature binding. */
  eSignLaw: Bi;
  /** Personal data protection law and its regulator. */
  dataLaw: Bi;
  /** Copyright law (economic rights can be assigned; moral rights stay with the author). */
  copyrightLaw: Bi;
  /** VAT or general sales tax rate in percent; 0 where there is none. */
  vatPercent: number;
  /** Anything that country's law needs said explicitly in the annex. */
  notes: Bi[];
};

const J: Record<CountryCode, Jurisdiction> = {
  jo: {
    code: "jo",
    eSignLaw: { ar: "قانون المعاملات الإلكترونية رقم (15) لسنة 2015 وتعديلاته", en: "Electronic Transactions Law No. 15 of 2015, as amended" },
    dataLaw: { ar: "قانون حماية البيانات الشخصية رقم (24) لسنة 2023", en: "Personal Data Protection Law No. 24 of 2023" },
    copyrightLaw: { ar: "قانون حماية حق المؤلف والحقوق المجاورة رقم (22) لسنة 1992 وتعديلاته", en: "Copyright and Neighbouring Rights Protection Law No. 22 of 1992, as amended" },
    vatPercent: 16,
    notes: [
      {
        ar: "الأسعار لا تشمل ضريبة المبيعات العامة ما لم يُذكر غير ذلك، وتصدر الوكالة فاتورتها وفق نظام الفوترة الوطني الإلكتروني متى كان ذلك مطلوبًا منها.",
        en: "Prices exclude general sales tax unless stated otherwise; the agency issues its invoices through the national e-invoicing system where it is required to.",
      },
    ],
  },
  sa: {
    code: "sa",
    eSignLaw: { ar: "نظام التعاملات الإلكترونية الصادر بالمرسوم الملكي رقم (م/18) وتاريخ 8/3/1428هـ", en: "Electronic Transactions Law, Royal Decree No. M/18 of 8/3/1428H" },
    dataLaw: { ar: "نظام حماية البيانات الشخصية الصادر بالمرسوم الملكي رقم (م/19) وتاريخ 9/2/1443هـ وتعديلاته، وتشرف عليه الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا)", en: "Personal Data Protection Law, Royal Decree No. M/19 of 9/2/1443H, as amended, supervised by the Saudi Data and AI Authority (SDAIA)" },
    copyrightLaw: { ar: "نظام حماية حقوق المؤلف الصادر بالمرسوم الملكي رقم (م/41) وتاريخ 2/7/1424هـ", en: "Copyright Law, Royal Decree No. M/41 of 2/7/1424H" },
    vatPercent: 15,
    notes: [
      {
        ar: "يُطبَّق نظام المعاملات المدنية فيما لم يرد فيه نص في هذا العقد. الأسعار لا تشمل ضريبة القيمة المضافة ما لم يُذكر غير ذلك، وتصدر الوكالة فواتير إلكترونية متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك.",
        en: "The Civil Transactions Law applies to anything this contract does not cover. Prices exclude VAT unless stated otherwise; the agency issues e-invoices that meet the Zakat, Tax and Customs Authority requirements.",
      },
      {
        ar: "أي إعلان عبر مشاهير أو صُنّاع محتوى يلتزم بأنظمة الهيئة العامة لتنظيم الإعلام، بما فيها ترخيص المعلن والإفصاح عن الإعلان.",
        en: "Any influencer or creator advertising follows the General Authority for Media Regulation rules, including the advertiser's licence and ad disclosure.",
      },
    ],
  },
  ae: {
    code: "ae",
    eSignLaw: { ar: "المرسوم بقانون اتحادي رقم (46) لسنة 2021 في شأن المعاملات الإلكترونية وخدمات الثقة", en: "Federal Decree-Law No. 46 of 2021 on Electronic Transactions and Trust Services" },
    dataLaw: { ar: "المرسوم بقانون اتحادي رقم (45) لسنة 2021 بشأن حماية البيانات الشخصية", en: "Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data" },
    copyrightLaw: { ar: "المرسوم بقانون اتحادي رقم (38) لسنة 2021 بشأن حقوق المؤلف والحقوق المجاورة", en: "Federal Decree-Law No. 38 of 2021 on Copyrights and Neighbouring Rights" },
    vatPercent: 5,
    notes: [
      {
        ar: "تسري القوانين الاتحادية لدولة الإمارات وقوانين الإمارة التي تقع فيها الوكالة. إذا كانت الوكالة مرخّصة في منطقة حرة مالية ذات نظام قضائي مستقل، يتفق الطرفان على اختصاص محاكم الإمارة المذكورة أعلاه.",
        en: "UAE federal law and the law of the emirate where the agency is based apply. If the agency is licensed in a financial free zone with its own courts, the parties still agree on the courts of the emirate named above.",
      },
      {
        ar: "الأسعار لا تشمل ضريبة القيمة المضافة ما لم يُذكر غير ذلك. أي إعلان عبر مؤثرين يلتزم بأنظمة المجلس الوطني للإعلام وترخيص المعلن.",
        en: "Prices exclude VAT unless stated otherwise. Influencer advertising follows the UAE Media Council rules and advertiser licensing.",
      },
    ],
  },
  kw: {
    code: "kw",
    eSignLaw: { ar: "القانون رقم (20) لسنة 2014 في شأن المعاملات الإلكترونية", en: "Law No. 20 of 2014 on Electronic Transactions" },
    dataLaw: { ar: "لائحة حماية خصوصية البيانات الصادرة عن هيئة الاتصالات وتقنية المعلومات (CITRA)", en: "Data Privacy Protection Regulation issued by the Communication and Information Technology Regulatory Authority (CITRA)" },
    copyrightLaw: { ar: "القانون رقم (75) لسنة 2019 بشأن حقوق المؤلف والحقوق المجاورة", en: "Law No. 75 of 2019 on Copyright and Related Rights" },
    vatPercent: 0,
    notes: [
      {
        ar: "لا توجد ضريبة قيمة مضافة في الكويت حتى تاريخ هذا العقد؛ إن فُرضت لاحقًا تُضاف إلى الأسعار وفق القانون.",
        en: "Kuwait has no VAT at the date of this contract; if one is introduced it is added to the prices as the law requires.",
      },
    ],
  },
  qa: {
    code: "qa",
    eSignLaw: { ar: "المرسوم بقانون رقم (16) لسنة 2010 بإصدار قانون المعاملات والتجارة الإلكترونية", en: "Decree-Law No. 16 of 2010 on Electronic Commerce and Transactions" },
    dataLaw: { ar: "القانون رقم (13) لسنة 2016 بشأن حماية خصوصية البيانات الشخصية", en: "Law No. 13 of 2016 on Personal Data Privacy Protection" },
    copyrightLaw: { ar: "القانون رقم (7) لسنة 2002 بشأن حماية حق المؤلف والحقوق المجاورة", en: "Law No. 7 of 2002 on the Protection of Copyright and Neighbouring Rights" },
    vatPercent: 0,
    notes: [
      {
        ar: "لا توجد ضريبة قيمة مضافة في قطر حتى تاريخ هذا العقد؛ إن فُرضت لاحقًا تُضاف إلى الأسعار وفق القانون.",
        en: "Qatar has no VAT at the date of this contract; if one is introduced it is added to the prices as the law requires.",
      },
    ],
  },
  bh: {
    code: "bh",
    eSignLaw: { ar: "المرسوم بقانون رقم (54) لسنة 2018 بإصدار قانون الخطابات والمعاملات الإلكترونية", en: "Legislative Decree No. 54 of 2018 on Electronic Communications and Transactions" },
    dataLaw: { ar: "القانون رقم (30) لسنة 2018 بإصدار قانون حماية البيانات الشخصية", en: "Law No. 30 of 2018, the Personal Data Protection Law" },
    copyrightLaw: { ar: "القانون رقم (22) لسنة 2006 بشأن حماية حقوق المؤلف والحقوق المجاورة", en: "Law No. 22 of 2006 on the Protection of Copyright and Neighbouring Rights" },
    vatPercent: 10,
    notes: [{ ar: "الأسعار لا تشمل ضريبة القيمة المضافة ما لم يُذكر غير ذلك.", en: "Prices exclude VAT unless stated otherwise." }],
  },
  om: {
    code: "om",
    eSignLaw: { ar: "قانون المعاملات الإلكترونية الصادر بالمرسوم السلطاني رقم (69/2008)", en: "Electronic Transactions Law, Royal Decree No. 69/2008" },
    dataLaw: { ar: "قانون حماية البيانات الشخصية الصادر بالمرسوم السلطاني رقم (6/2022)", en: "Personal Data Protection Law, Royal Decree No. 6/2022" },
    copyrightLaw: { ar: "قانون حقوق المؤلف والحقوق المجاورة الصادر بالمرسوم السلطاني رقم (65/2008)", en: "Copyright and Related Rights Law, Royal Decree No. 65/2008" },
    vatPercent: 5,
    notes: [{ ar: "الأسعار لا تشمل ضريبة القيمة المضافة ما لم يُذكر غير ذلك.", en: "Prices exclude VAT unless stated otherwise." }],
  },
  eg: {
    code: "eg",
    eSignLaw: { ar: "القانون رقم (15) لسنة 2004 بتنظيم التوقيع الإلكتروني ولائحته التنفيذية", en: "Law No. 15 of 2004 regulating Electronic Signature, and its executive regulations" },
    dataLaw: { ar: "القانون رقم (151) لسنة 2020 بإصدار قانون حماية البيانات الشخصية", en: "Law No. 151 of 2020, the Personal Data Protection Law" },
    copyrightLaw: { ar: "القانون رقم (82) لسنة 2002 بإصدار قانون حماية حقوق الملكية الفكرية", en: "Law No. 82 of 2002 on the Protection of Intellectual Property Rights" },
    vatPercent: 14,
    notes: [
      {
        ar: "يقرّ الطرفان بأن التوقيع الإلكتروني على هذه المنصة وسجلّه دليل كتابي على الاتفاق. ولمن يريد الحجية الكاملة المقررة للتوقيع الإلكتروني المعتمد، يجوز للطرفين توقيع نسخة PDF هذه بشهادة توقيع صادرة عن جهة مرخّصة من هيئة تنمية صناعة تكنولوجيا المعلومات (إيتيدا) أو توقيعها يدويًا.",
        en: "The parties accept the e-signature on this platform and its record as written evidence of their agreement. For the full evidential weight of a certified e-signature, the parties may also sign this PDF with a certificate from an ITIDA-licensed provider, or by hand.",
      },
      { ar: "الأسعار لا تشمل ضريبة القيمة المضافة ما لم يُذكر غير ذلك.", en: "Prices exclude VAT unless stated otherwise." },
    ],
  },
};

export const jurisdictionOf = (code: string | null | undefined): Jurisdiction => J[countryOf(code).code];
export const JURISDICTIONS = COUNTRY_CODES.map((c) => J[c]);

/**
 * Version of the clause texts in lib/legal/clauses.ts. It is part of the
 * signed terms, so a contract always renders with the words that were signed:
 * change the wording → add a new version, keep the old one.
 */
export const LEGAL_VERSION = "2026-09";
