import "./setup-db";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { replyAddress, setSupportStatus, submitSupportRequest, supportRef } from "@/lib/data/bugs";
import { notifySupportReceived, sendSupportUpdates, supportEmail } from "@/lib/data/support-notify";
import { closeDb } from "@/lib/db";

type Sent = { to: string; subject: string; text: string };
let sent: Sent[] = [];

beforeEach(() => {
  sent = [];
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: { body: string }) => {
      sent.push(JSON.parse(init.body) as Sent);
      return new Response("{}");
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
afterAll(() => closeDb());

const report = (email: string | null, locale = "ar") =>
  submitSupportRequest({ kind: "bug", message: "زر الحفظ لا يعمل في صفحة الأعمال", email, locale }).then((r) => r.id);

describe("report emails to the person who sent it (docs/61)", () => {
  it("sends one receipt with the report number, never the report text", async () => {
    const id = await report("sara@agency.jo");
    await notifySupportReceived(id);
    await notifySupportReceived(id);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("sara@agency.jo");
    expect(sent[0].subject).toContain(supportRef(id));
    expect(sent[0].text).toContain(supportRef(id));
    expect(sent[0].text).not.toContain("زر الحفظ");
  });

  it("emails nothing when no address was left", async () => {
    const id = await report(null);
    await notifySupportReceived(id);
    await setSupportStatus(id, null, "done", "fixed", "abc1234");
    expect(await sendSupportUpdates()).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("emails once when the report is being worked on and once when it is handled", async () => {
    const id = await report("omar@shop.jo", "en");
    await notifySupportReceived(id);
    sent = [];
    expect(await sendSupportUpdates()).toBe(0); // still new: the receipt was enough

    await setSupportStatus(id, null, "planned", "on the list");
    expect(await sendSupportUpdates()).toBe(1);
    expect(await sendSupportUpdates()).toBe(0);
    await setSupportStatus(id, null, "done", "fixed", "abc1234");
    expect(await sendSupportUpdates()).toBe(1);
    expect(await sendSupportUpdates()).toBe(0);

    expect(sent.map((m) => m.subject)).toEqual([`Your report ${supportRef(id)} is being worked on · Sawwiq`, `Your report ${supportRef(id)} has been handled · Sawwiq`]);
    expect(sent.every((m) => m.to === "omar@shop.jo")).toBe(true);
  });

  it("does not email a declined report", async () => {
    const id = await report("lina@studio.jo");
    await notifySupportReceived(id);
    sent = [];
    await setSupportStatus(id, null, "declined", "duplicate");
    expect(await sendSupportUpdates()).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("writes in Arabic unless the report was sent in English", () => {
    expect(supportEmail("done", "1A2B3C4D", null).subject).toBe("تمت معالجة بلاغك رقم 1A2B3C4D · سوّق");
    expect(supportEmail("received", "1A2B3C4D", "en").lines[0]).toBe("Thank you for contacting Sawwiq.");
    expect(supportEmail("received", "1A2B3C4D", "ar").lines.at(-1)).toContain("/ar/support");
  });

  it("answers Contact support by email, and keeps a help-chat report email-free", () => {
    expect(replyAddress(undefined, "sara@agency.jo", "owner@agency.jo")).toBe("sara@agency.jo");
    expect(replyAddress(undefined, "", "owner@agency.jo")).toBe("owner@agency.jo");
    expect(replyAddress(undefined, "", null)).toBeNull();
    expect(replyAddress("chat", "", "owner@agency.jo")).toBeNull();
  });
});
