import type { Bi } from "./clauses";

/**
 * Who holds a client's milestone payments, in the words the contract, its PDF
 * and every payment screen use. There are exactly two states
 * (lib/payments/readiness.ts):
 *  - live: a licensed payment partner is connected and switched on;
 *  - test: the built-in test checkout, no real money.
 * Sawwiq itself never holds client money in either state.
 */
export type PaymentState = "live" | "test";

export const paymentStateOf = (live: boolean): PaymentState => (live ? "live" : "test");

/** The one-line statement for screens and landing copy. */
export const HOLDER_LINE: Record<PaymentState, Bi> = {
  live: {
    ar: "تُدفع مبالغ المراحل إلى شريك الدفع المرخّص لدى سوّق، ويحفظها إلى أن تُقبل المرحلة، ثم يحوّلها إلى الوكالة. سوّق لا تحتفظ بالأموال في حساباتها.",
    en: "Milestone payments are made to Sawwiq's licensed payment partner, which holds them until the milestone is accepted and then pays the agency. Sawwiq never holds the money in its own accounts.",
  },
  test: {
    ar: "الدفع المحمي في وضع التجربة: لا تُحصَّل أي أموال حقيقية ولا تُحفظ عبر سوّق حتى يُربط شريك الدفع المرخّص لدى سوّق. يمكنك تجربة الخطوات كاملة بالدفع التجريبي.",
    en: "Protected payments are in test mode: no real money is collected or held through Sawwiq until Sawwiq's licensed payment partner is connected. You can try every step with the test checkout.",
  },
};

/** Short name of the holder, for labels such as "Held by …". */
export const HOLDER_NAME: Record<PaymentState, Bi> = {
  live: { ar: "شريك الدفع المرخّص لدى سوّق", en: "Sawwiq's licensed payment partner" },
  test: { ar: "وضع التجربة (بلا أموال حقيقية)", en: "test mode (no real money)" },
};

/** The payment section of the contract (terms v4). {fee} is the fee percent. */
export const PAYMENT_SECTION: Record<PaymentState, Bi> = {
  live: {
    ar: "يدفع العميل مبلغ كل مرحلة قبل بدء العمل عليها إلى شريك الدفع المرخّص لدى سوّق، الذي يحفظه ولا يحوّله إلى الوكالة إلا بعد قبول المرحلة (بتأكيد العميل أو بانقضاء مدة المراجعة دون اعتراض) أو بقرار نهائي في خلاف. رسوم سوّق {fee}٪ من الجزء المحوَّل إلى الوكالة فقط، وتُخصم منه قبل التحويل؛ ولا رسوم على أي مبلغ يُعاد إلى العميل. سوّق لا تحتفظ بأموال الطرفين في حساباتها.",
    en: "Before work on a milestone starts, the client pays its amount to Sawwiq's licensed payment partner, which holds it and pays it to the agency only once the milestone is accepted (confirmed by the client, or not objected to within the review period) or under a final dispute decision. Sawwiq's fee is {fee}% of the part paid to the agency only, deducted before payout; nothing refunded to the client carries a fee. Sawwiq never holds the parties' money in its own accounts.",
  },
  test: {
    ar: "الدفع المحمي على سوّق في وضع التجربة حتى يُربط شريك الدفع المرخّص لدى سوّق: خطوات الدفع والتحرير والاسترداد على المنصة محاكاة بلا أموال حقيقية، ولا تحفظ سوّق أي مبلغ ولا تضمن تحويله. يتفق الطرفان على دفع مبالغ المراحل مباشرة بينهما، ويستعملان قوائم التسليم ومواعيد المراجعة وسجلّ العقد على المنصة كما هي. لا تتقاضى سوّق رسومًا على هذا العقد في وضع التجربة.",
    en: "Protected payments on Sawwiq are in test mode until Sawwiq's licensed payment partner is connected: the pay-in, release and refund steps on the platform are a simulation with no real money, and Sawwiq holds no money and guarantees no payout. The parties settle milestone payments directly between themselves and still use the platform's checklists, review deadlines and contract record as written. Sawwiq charges no fee on this contract in test mode.",
  },
};
