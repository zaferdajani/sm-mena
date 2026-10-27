import "./setup-db";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitSupportRequest, supportRef } from "@/lib/data/bugs";
import { addReporterMessage, addStaffReply, confirmFixed, reportsForViewer, sendSupportReplies, threadByToken } from "@/lib/data/support-threads";
import { closeDb, getDb } from "@/lib/db";
import { supportRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Sent = { to: string; subject: string; text: string };
let sent: Sent[] = [];
beforeEach(() => {
  sent = [];
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn(async (_u: string, init: { body: string }) => (sent.push(JSON.parse(init.body) as Sent), new Response("{}"))));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
afterAll(() => closeDb());

const status = async (id: string) => (await (await getDb()).select().from(supportRequests).where(eq(supportRequests.id, id)))[0];

describe("support conversations (docs/63)", () => {
  it("gives each report a private link that reaches that report only", async () => {
    const a = await submitSupportRequest({ kind: "bug", message: "زر الحفظ لا يعمل", visitorId: "11111111-1111-4111-8111-111111111111" });
    const b = await submitSupportRequest({ kind: "bug", message: "another", visitorId: "22222222-2222-4222-8222-222222222222" });
    expect(a.accessToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect((await threadByToken(a.accessToken!))?.request.id).toBe(a.id);
    expect(await threadByToken("not-a-real-token-but-long-enough")).toBeNull();
    const mine = await reportsForViewer("11111111-1111-4111-8111-111111111111", null);
    expect(mine.map((r) => r.ref)).toContain(supportRef(a.id));
    expect(mine.map((r) => r.ref)).not.toContain(supportRef(b.id));
  });

  it("a reply reaches the reporter as a link by email, once; their answer reopens the report", async () => {
    const r = await submitSupportRequest({ kind: "bug", message: "الصفحة لا تفتح", email: "tester@agency.jo", locale: "ar" });
    await addStaffReply(r.id, "أصلحنا المشكلة، جرّب مجدداً من فضلك.", "done");
    expect((await status(r.id)).reporterUnread).toBe(true);
    expect(await sendSupportReplies()).toBe(1);
    expect(await sendSupportReplies()).toBe(0);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain(`/ar/support/t/${r.accessToken}`);
    expect(sent[0].text).not.toContain("أصلحنا المشكلة");
    await addReporterMessage(r.id, "ما زالت لا تفتح على الآيفون", [], []);
    const after = await status(r.id);
    expect(after.status).toBe("new");
    expect(after.reporterUnread).toBe(false);
  });

  it("'It works now' closes the report as confirmed", async () => {
    const r = await submitSupportRequest({ kind: "bug", message: "x y z" });
    await addStaffReply(r.id, "fixed", "done");
    await confirmFixed(r.id);
    const row = await status(r.id);
    expect(row.status).toBe("done");
    expect(row.confirmedAt).not.toBeNull();
    expect((await threadByToken(r.accessToken!))!.messages.at(-1)!.author).toBe("reporter");
  });
});
