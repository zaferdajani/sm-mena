import { describe, expect, it } from "vitest";
import { newRunKeys, open, queueUpdates, redactContact, seal, type QueueBundle } from "@/lib/bug-queue";

const bundle: QueueBundle = {
  exportedAt: "2026-10-26T00:00:00.000Z",
  reports: [{ id: "a", ref: "AAAAAAAA", kind: "bug", message: "زر الحفظ لا يعمل", path: "/ar/studio", locale: "ar", viewport: "390x844", appCommit: null, userAgent: "x", reporterRole: "agency", wantsReply: false, createdAt: "2026-10-26T00:00:00.000Z", screenshots: [{ name: "AAAAAAAA-1.webp", base64: "AAEC" }] }],
  errors: [],
  waitingOnOwner: 0,
};

describe("bug queue", () => {
  it("only the run's private key opens a sealed bundle", () => {
    const keys = newRunKeys();
    const sealed = seal(bundle, keys.publicKey);
    expect(sealed.data).not.toContain("الحفظ");
    expect(open(sealed, keys.privateKey)).toEqual(bundle);
    expect(() => open(sealed, newRunKeys().privateKey)).toThrow();
  });

  it("removes emails and phone numbers, in Arabic digits too", () => {
    expect(redactContact("write to sara@agency.jo or call +962 79 123 4567")).toBe("write to [email] or call [phone]");
    expect(redactContact("رقمي ٠٧٩١٢٣٤٥٦٧")).toBe("رقمي [phone]");
    expect(redactContact("the 3 buttons on step 2 of 5")).toBe("the 3 buttons on step 2 of 5");
    expect(redactContact("params: 75cdee6a-53d4-4b21-9c3e-e457a8f9738c")).toBe("params: 75cdee6a-53d4-4b21-9c3e-e457a8f9738c");
    expect(redactContact("اتصل 0791234567.")).toBe("اتصل [phone].");
  });

  it("accepts a fix only with its commit", () => {
    expect(queueUpdates.safeParse([{ type: "report", ref: "1A2B3C4D", status: "done", note: "Fixed the save button" }]).success).toBe(false);
    expect(queueUpdates.safeParse([{ type: "report", ref: "1A2B3C4D", status: "done", note: "Fixed the save button", commit: "abc1234" }]).success).toBe(true);
    expect(queueUpdates.safeParse([{ type: "error", id: 4, status: "cannot_reproduce", note: "Not seen since the 12 Oct deploy" }]).success).toBe(true);
  });
});
