import "./setup-db";
import { afterAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { setSupportStatus, submitSupportRequest } from "@/lib/data/bugs";
import { listNotifications } from "@/lib/data/notifications";
import { notifyReporter } from "@/lib/data/support-inbox";
import { addStaffReply } from "@/lib/data/support-threads";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";

afterAll(() => closeDb());

describe("support notices in the reporter's notification centre (docs/63)", () => {
  it("an agency owner's report notifies the Studio bell: receipt, then one notice per status and per reply", async () => {
    const stamp = Date.now();
    const user = await createUser(`inbox-${stamp}@test.jo`, "x".repeat(24), "agency");
    const agency = await createAgency(user.id, { name: `Inbox ${stamp}`, handle: `inbox${stamp}`, city: "amman", bio: "", services: ["seo"], platforms: [], industries: [], languages: ["ar"] } as never);
    const { id, accessToken } = await submitSupportRequest({ kind: "bug", message: "the save button does nothing", userId: user.id, locale: "en" });
    expect(await notifyReporter(id, "support_received")).toBe(true);
    let rows = await listNotifications({ agencyId: agency.id });
    expect(rows.map((n) => n.kind)).toEqual(["support_received"]);
    expect(rows[0].href).toBe(`/support/t/${accessToken}`);
    expect(String(rows[0].params.ref)).toHaveLength(8);
    // A status change and a reply each add a notice; a second status change replaces the unread first one.
    await setSupportStatus(id, null, "planned", "looking");
    await setSupportStatus(id, null, "done", "fixed", "abc1234");
    await addStaffReply(id, "It works now, thank you for reporting it.");
    rows = await listNotifications({ agencyId: agency.id });
    expect(rows.filter((n) => n.kind === "support_update")).toHaveLength(1);
    expect(rows.find((n) => n.kind === "support_update")?.params.status).toBe("done");
    expect(rows.filter((n) => n.kind === "support_reply")).toHaveLength(1);
    // Never the report text.
    expect(JSON.stringify(rows)).not.toContain("save button");
  });

  it("an anonymous report notifies the device it came from; a report with neither user nor device notifies nobody", async () => {
    const visitorId = `visitor-${Date.now()}`;
    const { id } = await submitSupportRequest({ kind: "question", message: "how do I add a logo?", visitorId });
    expect(await notifyReporter(id, "support_received")).toBe(true);
    const rows = await listNotifications({ visitorId });
    expect(rows.map((n) => n.kind)).toEqual(["support_received"]);
    const { id: orphan } = await submitSupportRequest({ kind: "question", message: "no trace" });
    expect(await notifyReporter(orphan, "support_received")).toBe(false);
  });
});
