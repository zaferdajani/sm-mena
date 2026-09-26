import "server-only";
import { eq } from "drizzle-orm";
import { mfaKeyConfigured } from "@/lib/auth/mfa";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { getFeatures } from "@/lib/features";
import { paymentProvider } from "@/lib/payments/provider";
import { protectedPaymentsLive } from "@/lib/payments/readiness";

// The go-live checklist for protected milestone payments (Admin → Features;
// docs/33-protected-payments-go-live.md). Some items the system checks by
// itself; the others the owner ticks when they are done in the real world.

export const MANUAL_STEPS = ["partnerChosen", "partnerSigned", "lawyerReviewed", "feeAccount", "sandboxTested", "pilotsChosen", "disputeCover"] as const;
export type ManualStep = (typeof MANUAL_STEPS)[number];
export type ManualTicks = Partial<Record<ManualStep, { at: string; by: string | null }>>;

const KEY = "golive_protected_payments";

export async function manualTicks(): Promise<ManualTicks> {
  const db = await getDb();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, KEY));
  return (row?.value as ManualTicks | undefined) ?? {};
}

export async function setManualTick(step: ManualStep, done: boolean, by: string | null) {
  const current = await manualTicks();
  const next: ManualTicks = { ...current };
  if (done) next[step] = { at: new Date().toISOString(), by };
  else delete next[step];
  const db = await getDb();
  await db.insert(appSettings).values({ key: KEY, value: next, updatedBy: by }).onConflictDoUpdate({ target: appSettings.key, set: { value: next, updatedAt: new Date(), updatedBy: by } });
  return next;
}

export type CheckItem = { key: string; done: boolean; manual: boolean; at?: string };

/** Everything that must be true before real money moves, in order. */
export async function goLiveChecklist(): Promise<{ items: CheckItem[]; ready: boolean; live: boolean; feature: string }> {
  const [ticks, features] = await Promise.all([manualTicks(), getFeatures()]);
  const manual = (k: ManualStep): CheckItem => ({ key: k, done: Boolean(ticks[k]), manual: true, at: ticks[k]?.at });
  const auto = (k: string, done: boolean): CheckItem => ({ key: k, done, manual: false });
  const items: CheckItem[] = [
    manual("partnerChosen"),
    manual("partnerSigned"),
    manual("lawyerReviewed"),
    manual("feeAccount"),
    auto("adapterConnected", paymentProvider().id !== "mock"),
    auto("webhookSecret", Boolean(process.env.PAYMENTS_WEBHOOK_SECRET)),
    auto("dailyJob", Boolean(process.env.CRON_SECRET)),
    auto("email", Boolean(process.env.RESEND_API_KEY)),
    auto("staff2fa", mfaKeyConfigured()),
    manual("sandboxTested"),
    manual("pilotsChosen"),
    manual("disputeCover"),
    auto("liveSwitch", protectedPaymentsLive()),
  ];
  const ready = items.filter((i) => i.key !== "liveSwitch").every((i) => i.done);
  return { items, ready, live: protectedPaymentsLive(), feature: features.protected_payments.state };
}
