// Staging-only demo people, wallets and contracts. Runs from `npm run db:seed`
// when STAGING_MODE=true, and refuses the production database. Idempotent.
import { eq } from "drizzle-orm";
import { COUNTRIES, currencyOf, type CountryCode } from "@/lib/countries";
import { assertStagingDatabase, isStagingMode } from "@/lib/core/rules/staging";
import { createAgency } from "@/lib/data/agencies";
import { saveOwnerNeed } from "@/lib/data/owner-needs";
import {
  approveMilestone,
  cancelContract,
  createContract,
  getContractByToken,
  openDispute,
  recordDeposit,
  setCheck,
  signAsClient,
  submitMilestone,
  type ContractInput,
  type ContractView,
} from "@/lib/data/contracts";
import { settleMilestone } from "@/lib/data/escrow";
import { createUser, getUserByEmail } from "@/lib/data/users";
import { getDb } from "@/lib/db";
import { agencies, appSettings, referralAgents, users } from "@/lib/db/schema";
import { creditVirtualWallet, debitVirtualWallet, openVirtualWallet } from "@/lib/payments/virtual-wallet";
import { STAGING_PASSWORD } from "@/lib/db/staging-password";

export { STAGING_PASSWORD };

const SIGNATURE = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"));
const OPENING_FILS = 2_000_000;
const FLAG = "staging_qa_v1";

const STAFF = [
  ["staging-admin@sawwiq.test", "admin"],
  ["staging-backbone@sawwiq.test", "backbone"],
  ["staging-maintenance@sawwiq.test", "maintenance"],
  ["staging-support@sawwiq.test", "support"],
] as const;

/** One sample contract per status, on a demo agency that the main seed creates. */
const CONTRACTS: { handle: string; status: "sent" | "active" | "funded" | "submitted" | "released" | "refunded" | "disputed" | "cancelled" | "direct"; country: CountryCode }[] = [
  { handle: "nakhla.studio", status: "sent", country: "jo" },
  { handle: "petra.growth", status: "active", country: "jo" },
  { handle: "najd.creative", status: "funded", country: "sa" },
  { handle: "dubai.loop", status: "submitted", country: "ae" },
  { handle: "gulf.pixel.kw", status: "released", country: "kw" },
  { handle: "doha.frame", status: "refunded", country: "qa" },
  { handle: "manama.social", status: "disputed", country: "bh" },
  { handle: "muscat.media", status: "cancelled", country: "om" },
  { handle: "nile.digital", status: "direct", country: "eg" },
];

async function userWith(email: string, role: (typeof users.role.enumValues)[number]) {
  return (await getUserByEmail(email)) ?? (await createUser(email, STAGING_PASSWORD, role));
}

async function tickAll(v: ContractView, milestoneId: string, by: "agency" | "client") {
  const m = v.milestones.find((x) => x.id === milestoneId);
  if (!m) return;
  for (const check of m.checks) await setCheck(v.contract.id, m.id, check.id, by, true);
}

export async function seedStaging(log: (...a: unknown[]) => void = console.log) {
  if (!isStagingMode()) return;
  assertStagingDatabase();
  const db = await getDb();
  const ownerEmail = "staging-owner@sawwiq.test";
  if (!(await getUserByEmail(ownerEmail))) await createUser(ownerEmail, STAGING_PASSWORD, "admin");
  const { ensureOwner } = await import("@/lib/data/staff");
  const [existingOwner] = await db.select({ email: users.email }).from(users).where(eq(users.role, "owner")).limit(1);
  if (!existingOwner) await ensureOwner(ownerEmail);

  for (const [email, role] of STAFF) await userWith(email, role);

  for (const country of COUNTRIES) {
    const code = country.code;
    const city = country.cities[0].key;
    const currency = currencyOf(code);
    const owner = await userWith(`staging.owner.${code}@sawwiq.test`, "client");
    await saveOwnerNeed(owner.id, {
      country: code,
      city,
      businessType: "restaurant_cafe",
      services: ["social_media"],
      timing: code === "sa" || code === "ae" ? "month" : "now",
      whatsapp: `+${country.dial}790000200`,
      note: `Staging business owner in ${country.en}.`,
    }, code === "eg" ? "ar" : "en");
    await openVirtualWallet(owner.email, currency, OPENING_FILS);

    const agencyEmail = `staging.agency.${code}@sawwiq.test`;
    if (!(await getUserByEmail(agencyEmail))) {
      const user = await createUser(agencyEmail, STAGING_PASSWORD, "agency");
      await createAgency(user.id, {
        handle: `staging.agency.${code}`,
        name: `Staging Agency ${country.en}`,
        bio: `Demo marketing agency for staging QA in ${country.en}. Virtual money only.`,
        city,
        services: ["smm_management", "smm_content"],
        platforms: ["instagram"],
        industries: ["restaurant_cafe"],
        languages: ["ar", "en"],
        startingPriceJod: 200,
        whatsapp: `+${country.dial}790000110`,
        email: `hello@staging-agency-${code}.example`,
      }, { isDemo: true, isVerified: true });
    }
    await openVirtualWallet(agencyEmail, currency, OPENING_FILS);

    const freeEmail = `staging.free.${code}@sawwiq.test`;
    if (!(await getUserByEmail(freeEmail))) {
      const user = await createUser(freeEmail, STAGING_PASSWORD, "agency");
      await createAgency(user.id, {
        handle: `staging.free.${code}`,
        name: `Staging Creator ${country.en}`,
        bio: `Demo freelancer / creator for staging QA in ${country.en}.`,
        city,
        kind: "freelancer",
        teamRoles: ["photographer", "content_writer_ar"],
        services: ["photography", "smm_content"],
        platforms: ["instagram", "tiktok"],
        industries: ["restaurant_cafe"],
        languages: ["ar", "en"],
        startingPriceJod: 80,
        whatsapp: `+${country.dial}790000120`,
        email: `hello@staging-free-${code}.example`,
      }, { isDemo: true });
    }
    await openVirtualWallet(freeEmail, currency, OPENING_FILS);

    const agentEmail = `staging.agent.${code}@sawwiq.test`;
    const agentUser = await userWith(agentEmail, "agent");
    const codeName = `stage-${code}`;
    const [agent] = await db.select({ id: referralAgents.id }).from(referralAgents).where(eq(referralAgents.userId, agentUser.id));
    if (!agent) {
      await db.insert(referralAgents).values({
        userId: agentUser.id,
        name: `Staging Agent ${country.en}`,
        code: codeName,
        phone: `+${country.dial}790000130`,
        rateFils: 5000,
        currency,
        note: "Staging QA referral agent",
      });
    }
    await openVirtualWallet(agentEmail, currency, OPENING_FILS);
  }

  for (const email of [ownerEmail, ...STAFF.map(([e]) => e)]) await openVirtualWallet(email, "JOD", OPENING_FILS);

  const [done] = await db.select().from(appSettings).where(eq(appSettings.key, FLAG));
  if (!done) {
    for (const spec of CONTRACTS) await seedContract(spec, log);
    await db.insert(appSettings).values({ key: FLAG, value: true }).onConflictDoNothing();
  }

  // Complete reference profiles for the staging agencies and freelancers (clients, projects, packages, reviews).
  const { fillReferenceAccounts } = await import("./staging-reference");
  await fillReferenceAccounts(log);

  log("Staging QA accounts (same password for every role):");
  log(`  password: ${STAGING_PASSWORD}`);
  log("  owner: staging-owner@sawwiq.test  (or the existing owner, if one was already promoted)");
  for (const [email, role] of STAFF) log(`  ${role}: ${email}`);
  for (const country of COUNTRIES) {
    log(`  ${country.code}: agency staging.agency.${country.code}@sawwiq.test · freelancer staging.free.${country.code}@sawwiq.test · business owner staging.owner.${country.code}@sawwiq.test · agent staging.agent.${country.code}@sawwiq.test (code stage-${country.code})`);
  }
  log("  Demo agencies from the main seed use the same staging password. Example: nakhla-studio@sawwiq.test");
  log("  Virtual cards: 4242424242424242 succeeds · 4000000000000002 declines · 4000000000009995 insufficient · 4000000000000069 expired · 4000000000000127 bad CVC. Expiry any future MM/YY, CVC any 3 digits.");
}

async function seedContract(spec: (typeof CONTRACTS)[number], log: (...a: unknown[]) => void) {
  const db = await getDb();
  const [agency] = await db.select().from(agencies).where(eq(agencies.handle, spec.handle));
  if (!agency) {
    log(`  skipped contract ${spec.status}: no agency @${spec.handle}`);
    return;
  }
  const clientEmail = `staging.owner.${spec.country}@sawwiq.test`;
  const input: ContractInput = {
    title: `Staging ${spec.status} · ${spec.handle}`,
    summary: "Sample staging contract so QA can see this status. Virtual money only.",
    items: [],
    specialRequests: [],
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    paymentMode: spec.status === "direct" ? "direct" : "protected",
    nda: false,
    client: { name: "Staging Client", phone: "+962790000199", email: clientEmail },
    milestones: [{ title: "First delivery", dueDate: "2026-11-15", amountFils: 150_000, checks: ["Draft", "Final files"] }],
    signerName: "Staging Agency",
    signature: SIGNATURE,
    signIp: "127.0.0.1",
    locale: "en",
  };
  const created = await createContract(agency.id, input);
  if ("error" in created) {
    log(`  contract ${spec.status} failed: ${created.error}`);
    return;
  }
  if (spec.status === "sent") return;
  let view = await getContractByToken(created.token);
  if (!view) return;
  const signed = await signAsClient(view, "Staging Client", "127.0.0.1", SIGNATURE);
  if ("error" in signed) {
    log(`  contract ${spec.status} sign failed: ${signed.error}`);
    return;
  }
  view = (await getContractByToken(created.token))!;
  if (spec.status === "cancelled") {
    await cancelContract(view, "client", "Staging sample cancellation before any payment");
    return;
  }
  if (spec.status === "active" || spec.status === "direct") return;
  const milestone = view.milestones[0];
  const deposited = await recordDeposit(milestone.id, milestone.amountFils, `mock_${milestone.id.slice(0, 8)}`, { provider: "mock", currency: view.contract.currency });
  if (deposited === "ok") await debitVirtualWallet(clientEmail, milestone.amountFils, view.contract.currency, `dep:${milestone.id}`, milestone.title);
  view = (await getContractByToken(created.token))!;
  if (spec.status === "funded") return;
  const id = view.milestones[0].id;
  await tickAll(view, id, "agency");
  view = (await getContractByToken(created.token))!;
  const submitted = await submitMilestone(view, id, "Staging delivery ready for review");
  if ("error" in submitted) {
    log(`  contract ${spec.status} submit failed: ${submitted.error}`);
    return;
  }
  view = (await getContractByToken(created.token))!;
  if (spec.status === "disputed") {
    await openDispute(view, "client", "Staging sample dispute on the funded milestone", id);
    return;
  }
  if (spec.status === "submitted") return;
  if (spec.status === "refunded") {
    await settleMilestone(view.contract, id, { releaseFils: 0, refundFils: view.milestones[0].amountFils }, { from: ["funded", "submitted"], note: "Staging sample refund" });
    await creditVirtualWallet(clientEmail, view.milestones[0].amountFils, view.contract.currency, `ref:${id}`, "staging sample refund");
    return;
  }
  await tickAll(view, id, "client");
  view = (await getContractByToken(created.token))!;
  const approved = await approveMilestone(view, id);
  if ("error" in approved) log(`  contract ${spec.status} approve failed: ${approved.error}`);
}
