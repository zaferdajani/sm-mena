import "./setup-db";
import { eq, max } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { assignFoundingSeats, seatOf, teaserStats } from "@/lib/data/teaser";
import { createUser } from "@/lib/data/users";
import { getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { seatLabel } from "@/lib/teaser";

vi.mock("server-only", () => ({}));

const mk = async (handle: string, city: string, extra: Record<string, unknown> = {}) => {
  const u = await createUser(`${handle}@seats.jo`, "password-123");
  return createAgency(u.id, { handle, name: handle, city, services: ["ads_meta"] }, extra);
};
const seatFor = async (id: string) => (await (await getDb()).select({ s: agencies.foundingSeat }).from(agencies).where(eq(agencies.id, id)))[0].s;

describe("founding seats", () => {
  it("numbers real providers in join order, skips demo ones, and never reuses a number", async () => {
    const first = await mk("seat-one", "amman");
    const demo = await mk("seat-demo", "amman", { isDemo: true });
    const second = await mk("seat-two", "riyadh");
    await assignFoundingSeats();
    const s1 = (await seatFor(first.id))!;
    const s2 = (await seatFor(second.id))!;
    // No numbers are burnt: the sequence stands exactly at the highest seat given.
    const [{ top }] = await (await getDb()).select({ top: max(agencies.foundingSeat) }).from(agencies);
    expect((await teaserStats()).nextSeat).toBe(top! + 1);
    // Other real agencies in the test database may be numbered in between.
    expect(s2).toBeGreaterThan(s1);
    expect(await seatFor(demo.id)).toBeNull();

    // A provider leaving does not free its number or move anyone else's.
    await (await getDb()).delete(agencies).where(eq(agencies.id, second.id));
    const third = await mk("seat-three", "amman");
    await assignFoundingSeats();
    const s3 = (await seatFor(third.id))!;
    expect(s3).toBeGreaterThan(s2);
    expect(await seatFor(first.id)).toBe(s1);

    const stats = await teaserStats();
    expect(stats.nextSeat).toBeGreaterThan(s3);
    const mine = await seatOf({ ...third, foundingSeat: await seatFor(third.id) });
    expect(mine?.seat).toBe(s3);
    // seat-one and seat-three are both in Amman (the demo agency does not count).
    expect(mine!.citySeat).toBeGreaterThanOrEqual(2);
    expect(await seatOf({ ...demo, foundingSeat: null })).toBeNull();
  });

  it("formats seat numbers with at least four digits", () => {
    expect(seatLabel(7)).toBe("#0007");
    expect(seatLabel(12345)).toBe("#12345");
  });
});
