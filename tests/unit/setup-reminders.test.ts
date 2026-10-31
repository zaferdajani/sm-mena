import "./setup-db";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createAgency } from "@/lib/data/agencies";
import { createPackage } from "@/lib/data/packages";
import { setPublication } from "@/lib/data/publication";
import { REMINDER_HOURS, reminderEmail, sendSetupReminders, setSetupReminders } from "@/lib/data/setup-reminders";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";

afterAll(() => closeDb());

const hours = (n: number) => n * 3_600_000;

describe("setup reminders (docs/65 stage 4)", () => {
  it("sends three at most, a day, three days and a week after sign-up, only to owners who asked, each once", async () => {
    const stamp = Date.now().toString(36);
    const db = await getDb();
    const yes = await createUser(`rem-yes-${stamp}@test.jo`, "x".repeat(24), "agency");
    const no = await createUser(`rem-no-${stamp}@test.jo`, "x".repeat(24), "agency");
    const a = await createAgency(yes.id, { name: "Wants reminders", handle: `remyes${stamp}`, city: "amman", services: [] } as never, { setupRemindersOptIn: true } as never);
    await createAgency(no.id, { name: "No reminders", handle: `remno${stamp}`, city: "amman", services: [] } as never);
    const signedUp = new Date("2026-11-01T10:00:00Z");
    await db.update(agencies).set({ createdAt: signedUp }).where(eq(agencies.id, a.id));

    expect(await sendSetupReminders(50, new Date(signedUp.getTime() + hours(2)))).toBe(0);
    expect(await sendSetupReminders(50, new Date(signedUp.getTime() + hours(25)))).toBe(1);
    // The same day again: nothing, it was claimed.
    expect(await sendSetupReminders(50, new Date(signedUp.getTime() + hours(26)))).toBe(0);
    expect(await sendSetupReminders(50, new Date(signedUp.getTime() + hours(REMINDER_HOURS[1] + 1)))).toBe(1);
    expect(await sendSetupReminders(50, new Date(signedUp.getTime() + hours(REMINDER_HOURS[2] + 1)))).toBe(1);
    expect(await sendSetupReminders(50, new Date(signedUp.getTime() + hours(400)))).toBe(0);
    const [row] = await db.select({ sent: agencies.setupRemindersSent, at: agencies.setupReminderAt }).from(agencies).where(eq(agencies.id, a.id));
    expect(row.sent).toBe(3);
    expect(row.at).not.toBeNull();
  });

  it("stops as soon as the page is match-ready, and the owner can switch it off", async () => {
    const stamp = Date.now().toString(36);
    const db = await getDb();
    const user = await createUser(`rem-ready-${stamp}@test.jo`, "x".repeat(24), "agency");
    const a = await createAgency(user.id, { name: "Ready", handle: `remready${stamp}`, city: "amman", services: ["seo"], whatsapp: "0790000000" } as never, { setupRemindersOptIn: true, postCount: 1 } as never);
    await setPublication(user.id, a.id, "public");
    await createPackage(a.id, { title: "SEO", description: "", service: "seo", priceJod: 100, billing: "monthly", deliverables: [], items: [], deliveryDays: null, translation: {} });
    const signedUp = new Date("2026-11-01T10:00:00Z");
    await db.update(agencies).set({ createdAt: signedUp }).where(eq(agencies.id, a.id));
    expect(await sendSetupReminders(50, new Date(signedUp.getTime() + hours(30)))).toBe(0);
    const [row] = await db.select({ optIn: agencies.setupRemindersOptIn }).from(agencies).where(eq(agencies.id, a.id));
    expect(row.optIn).toBe(false);

    const other = await createUser(`rem-off-${stamp}@test.jo`, "x".repeat(24), "agency");
    const b = await createAgency(other.id, { name: "Off", handle: `remoff${stamp}`, city: "amman", services: [] } as never, { setupRemindersOptIn: true } as never);
    expect(await setSetupReminders(other.id, b.id, false)).toBe(true);
    expect(await setSetupReminders(user.id, b.id, true)).toBe(false); // not the owner
    await db.update(agencies).set({ createdAt: signedUp }).where(eq(agencies.id, b.id));
    expect(await sendSetupReminders(50, new Date(signedUp.getTime() + hours(30)))).toBe(0);
  });

  it("the email names the next step and how to stop, in the page's language", () => {
    const ar = reminderEmail("ar", "work", "https://sawwiq.org/ar/studio");
    expect(ar.lines.join("\n")).toContain("أضف أول عمل");
    expect(ar.lines.join("\n")).toContain("https://sawwiq.org/ar/studio");
    const en = reminderEmail("en", "publish", "https://sawwiq.org/en/studio");
    expect(en.lines.join("\n")).toContain("Publish your page");
    expect(en.lines.join("\n")).toContain("stop");
  });
});
