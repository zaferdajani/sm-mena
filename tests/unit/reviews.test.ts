import "./setup-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency, getAgencyByHandle } from "@/lib/data/agencies";
import { createInquiry } from "@/lib/data/interactions";
import { createPackage, listPackages, MAX_PACKAGES } from "@/lib/data/packages";
import {
  canReviewAfterInquiry,
  createReviewInvite,
  ratingSummary,
  replyToReview,
  resolveInvite,
  setReviewStatus,
  submitInquiryReview,
  submitInviteReview,
} from "@/lib/data/reviews";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { inquiries } from "@/lib/db/schema";
import { parseGoogleInput } from "@/lib/google";
import { sql } from "drizzle-orm";

let agencyId: string;
const review = (visitorId: string, rating = 5) => ({
  rating,
  quality: 5,
  communication: 4,
  value: null,
  timeliness: null,
  body: "Great work on our Instagram, results came fast.",
  reviewerName: "Sara",
  visitorId,
});

beforeAll(async () => {
  const user = await createUser("rev@test.jo", "password-123");
  agencyId = (await createAgency(user.id, { handle: "review.me", name: "Review Me", city: "amman", services: ["smm_management"] })).id;
});
afterAll(() => closeDb());

describe("invite reviews", () => {
  it("accept one review per link and update the average", async () => {
    const { token } = await createReviewInvite(agencyId, "Sara");
    expect(await resolveInvite(token)).not.toBeNull();
    expect(await submitInviteReview(token, review("v1", 5))).not.toBeNull();
    expect(await submitInviteReview(token, review("v2", 1))).toBeNull(); // reused link
    expect(await resolveInvite(token)).toBeNull();
    const agency = await getAgencyByHandle("review.me");
    expect(ratingSummary(agency!)).toEqual({ average: 5, count: 1 });
  });

  it("rejects malformed and unknown tokens", async () => {
    expect(await resolveInvite("../../etc")).toBeNull();
    expect(await resolveInvite("A".repeat(24))).toBeNull();
  });
});

describe("reviews after contacting an agency", () => {
  it("require an inquiry at least N days old and allow one review per visitor", async () => {
    expect(await canReviewAfterInquiry("v3", agencyId)).toBe(false);
    await createInquiry({ agencyId, name: "B", phone: "+962790000000", message: "Hello there", visitorId: "v3" });
    expect(await canReviewAfterInquiry("v3", agencyId)).toBe(false); // too recent
    const db = await getDb();
    await db.update(inquiries).set({ createdAt: sql`now() - interval '10 days'` });
    expect(await canReviewAfterInquiry("v3", agencyId)).toBe(true);
    expect(await submitInquiryReview(agencyId, review("v3", 3))).not.toBeNull();
    expect(await canReviewAfterInquiry("v3", agencyId)).toBe(false);
    expect(ratingSummary((await getAgencyByHandle("review.me"))!)).toEqual({ average: 4, count: 2 });
  });
});

describe("moderation and replies", () => {
  it("hiding a review removes it from the average; showing restores it", async () => {
    const { token } = await createReviewInvite(agencyId, "X");
    const r = await submitInviteReview(token, review("v4", 1));
    expect(ratingSummary((await getAgencyByHandle("review.me"))!).count).toBe(3);
    await setReviewStatus(r!.id, "hidden");
    expect(ratingSummary((await getAgencyByHandle("review.me"))!)).toEqual({ average: 4, count: 2 });
    await setReviewStatus(r!.id, "hidden"); // idempotent
    expect(ratingSummary((await getAgencyByHandle("review.me"))!).count).toBe(2);
    await setReviewStatus(r!.id, "published");
    expect(ratingSummary((await getAgencyByHandle("review.me"))!).count).toBe(3);
    expect(await replyToReview(agencyId, r!.id, "Thanks!")).toBe(true);
    expect(await replyToReview("00000000-0000-0000-0000-000000000000", r!.id, "Nope")).toBe(false);
  });
});

describe("packages", () => {
  it("caps packages per agency", async () => {
    for (let i = 0; i < MAX_PACKAGES + 2; i++) {
      await createPackage(agencyId, { title: `P${i}`, description: "", service: "smm_management", priceJod: 100 + i, billing: "monthly", deliverables: [] });
    }
    expect(await listPackages(agencyId)).toHaveLength(MAX_PACKAGES);
  });
});

describe("google input", () => {
  it("parses place ids, place_id params and maps place URLs", () => {
    expect(parseGoogleInput("ChIJN1t_tDeuEmsRUsoyG83frY4")).toEqual({ placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4" });
    expect(parseGoogleInput("https://www.google.com/maps/search/?api=1&query=x&query_place_id=ChIJabc123def456")).toEqual({ placeId: "ChIJabc123def456" });
    expect(parseGoogleInput("https://www.google.com/maps/place/Nakhla+Studio/@31.9,35.9,17z")).toEqual({ query: "Nakhla Studio" });
    expect(parseGoogleInput("  ")).toBeNull();
  });
});
