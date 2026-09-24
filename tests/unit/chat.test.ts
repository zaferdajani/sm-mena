import "./setup-db";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { can } from "@/lib/auth/permissions";
import { CHAT_NOTICE_VERSION, pollDelay, POLL_ACTIVE_MS, POLL_AWAY_MS, POLL_IDLE_MS } from "@/lib/chat";
import { createAgency } from "@/lib/data/agencies";
import {
  clientMayAccess,
  conversationForAgency,
  conversationForClient,
  getConversation,
  listAgencyConversations,
  listMessages,
  listVisitorConversations,
  markRead,
  openRequestConversation,
  sendMessage,
  setMessageHidden,
  toChatMessage,
  unreadByRequest,
  unreadForAgency,
  unreadForVisitor,
} from "@/lib/data/conversations";
import { createInquiry } from "@/lib/data/interactions";
import { listNotifications, markNotificationsRead, unreadNotificationCount } from "@/lib/data/notifications";
import { createProjectRequest, listOpportunities, markOpportunityViewed, newOpportunityCount, setProposalStatus, submitProposal } from "@/lib/data/requests";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { conversationMessages, conversations } from "@/lib/db/schema";
import { resetRateLimits } from "@/lib/rate-limit";

type Ag = { id: string; services: string[]; isDemo?: boolean; userId: string };
let a: Ag;
let b: Ag;
let demo: Ag;

const mk = async (handle: string, extra: Record<string, unknown> = {}): Promise<Ag> => {
  const u = await createUser(`${handle}@chat.jo`, "password-123");
  const ag = await createAgency(u.id, { handle, name: `Agency ${handle}`, city: "amman", services: ["ads_meta"], startingPriceJod: 300 }, extra);
  return { id: ag.id, services: ag.services, isDemo: ag.isDemo, userId: u.id };
};

const proposal = { priceJod: 300, billing: "monthly" as const, timeline: "Next week", message: "We can start right away." };

async function newRequest(visitorId: string, invite: Ag[] = [a, b], source: "form" | "demo" = "form") {
  return createProjectRequest(
    { clientName: "Rana", phone: "+962790000123", services: ["ads_meta"], platforms: [], description: "Meta ads for a bakery", source, visitorId },
    invite.map((x, i) => ({ agencyId: x.id, score: 90 - i })),
  );
}

beforeAll(async () => {
  a = await mk("chat.alpha");
  b = await mk("chat.beta");
  demo = await mk("chat.demo", { isDemo: true });
});
beforeEach(() => resetRateLimits());
afterAll(() => closeDb());

describe("opening a conversation", () => {
  it("is refused until the agency sent a proposal (briefs stay anonymous)", async () => {
    const { request } = await newRequest("client-gate");
    expect(await openRequestConversation(request.id, a.id)).toBeNull();
    await submitProposal(a, request.id, proposal);
    const conv = await openRequestConversation(request.id, a.id);
    expect(conv).not.toBeNull();
    expect(conv!.clientName).toBe("Rana");
    expect(conv!.clientVisitorId).toBe("client-gate");
    expect(conv!.noticeVersion).toBe(CHAT_NOTICE_VERSION);
    // Idempotent: the same pair always gets the same conversation.
    expect((await openRequestConversation(request.id, a.id))!.id).toBe(conv!.id);
    // Only its own agency and its own client can reach it.
    expect(await conversationForAgency(b.id, conv!.id)).toBeNull();
    expect(await conversationForAgency(a.id, conv!.id)).not.toBeNull();
    expect(await conversationForClient(conv!.id, { visitorId: "someone-else" })).toBeNull();
    expect(await conversationForClient(conv!.id, { visitorId: "client-gate" })).not.toBeNull();
  });

  it("lets the holder of the request's private link in from another device", async () => {
    const { request, token } = await newRequest("client-token");
    await submitProposal(a, request.id, proposal);
    const conv = (await openRequestConversation(request.id, a.id))!;
    expect(await clientMayAccess(conv, { visitorId: "other-device", token })).toBe(true);
    const other = await newRequest("client-other");
    expect(await clientMayAccess(conv, { visitorId: "other-device", token: other.token })).toBe(false);
  });
});

describe("messages", () => {
  it("sends, pages by id, tracks read cursors and unread counts", async () => {
    const { request } = await newRequest("client-msg");
    await submitProposal(a, request.id, proposal);
    const conv = (await openRequestConversation(request.id, a.id))!;
    expect(await unreadForAgency(a.id)).toBe(0);

    expect(await sendMessage(conv, "client", "   ", { visitorId: "client-msg" })).toEqual({ error: "invalid" });
    expect(await sendMessage(conv, "client", "x".repeat(2001), { visitorId: "client-msg" })).toEqual({ error: "invalid" });

    const first = await sendMessage(conv, "client", "  Hello, is the price negotiable?  ", { visitorId: "client-msg", ip: "10.0.0.1" });
    if (!("message" in first)) throw new Error("expected a message");
    expect(first.message.body).toBe("Hello, is the price negotiable?");
    expect(await unreadForAgency(a.id)).toBe(1);
    expect(await unreadForVisitor("client-msg")).toBe(0); // own message
    expect((await unreadByRequest("client-msg", [request.id])).get(request.id)).toBeUndefined();

    const reply = await sendMessage((await getConversation(conv.id))!, "agency", "Yes, for a 3-month contract.", { userId: a.userId });
    if (!("message" in reply)) throw new Error("expected a reply");
    // Sending moves the sender's own cursor.
    expect(await unreadForAgency(a.id)).toBe(0);
    expect(await unreadForVisitor("client-msg")).toBe(1);
    expect((await unreadByRequest("client-msg", [request.id])).get(request.id)).toBe(1);

    for (let i = 0; i < 5; i++) await sendMessage(conv, "client", `Follow-up ${i}`, { visitorId: "client-msg" });
    const all = await listMessages(conv.id);
    expect(all.map((m) => m.body)).toEqual(["Hello, is the price negotiable?", "Yes, for a 3-month contract.", "Follow-up 0", "Follow-up 1", "Follow-up 2", "Follow-up 3", "Follow-up 4"]);
    const newer = await listMessages(conv.id, { afterId: all[4].id });
    expect(newer.map((m) => m.body)).toEqual(["Follow-up 3", "Follow-up 4"]);
    const older = await listMessages(conv.id, { beforeId: all[3].id, limit: 2 });
    expect(older.map((m) => m.body)).toEqual(["Yes, for a 3-month contract.", "Follow-up 0"]);
    const latest = await listMessages(conv.id, { limit: 3 });
    expect(latest.map((m) => m.id)).toEqual(all.slice(-3).map((m) => m.id));

    // Read cursors only move forward.
    const fresh = (await getConversation(conv.id))!;
    await markRead(fresh, "client", fresh.lastMessageId);
    expect(await unreadForVisitor("client-msg")).toBe(0);
    await markRead(fresh, "client", 1);
    expect((await getConversation(conv.id))!.clientLastReadId).toBe(fresh.lastMessageId);
    expect(await unreadForAgency(a.id)).toBe(1);
    await markRead(fresh, "agency", all[4].id);
    expect(await unreadForAgency(a.id)).toBe(1); // still two newer ones
    await markRead(fresh, "agency", Number.MAX_SAFE_INTEGER);
    expect(await unreadForAgency(a.id)).toBe(0);
    expect((await getConversation(conv.id))!.agencyLastReadId).toBe(fresh.lastMessageId); // capped at the last message

    const agencyList = await listAgencyConversations(a.id);
    expect(agencyList.find((r) => r.conversation.id === conv.id)?.preview).toBe("Follow-up 4");
    expect((await listVisitorConversations("client-msg")).map((r) => r.conversation.id)).toEqual([conv.id]);
  });

  it("keeps messages append-only: no edits, no deletes, only staff hiding", async () => {
    const { request } = await newRequest("client-log");
    await submitProposal(a, request.id, proposal);
    const conv = (await openRequestConversation(request.id, a.id))!;
    const sent = await sendMessage(conv, "agency", "Our price is 300.", { userId: a.userId, ip: "10.0.0.2" });
    if (!("message" in sent)) throw new Error("expected a message");
    const db = await getDb();
    await expect(db.update(conversationMessages).set({ body: "Our price is 200." }).where(eq(conversationMessages.id, sent.message.id))).rejects.toThrow();
    await expect(db.update(conversationMessages).set({ side: "client" }).where(eq(conversationMessages.id, sent.message.id))).rejects.toThrow();
    await expect(db.delete(conversationMessages).where(eq(conversationMessages.id, sent.message.id))).rejects.toThrow();

    const [stored] = await db.select().from(conversationMessages).where(eq(conversationMessages.id, sent.message.id));
    expect(stored.body).toBe("Our price is 300.");
    expect(stored.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.ipHash).not.toContain("10.0.0.2");

    const staff = await createUser("staff@chat.jo", "password-123", "support");
    expect(await setMessageHidden(sent.message.id, staff.id, true)).toEqual({ id: sent.message.id, conversationId: conv.id });
    const [hidden] = await listMessages(conv.id);
    expect(toChatMessage(hidden)).toMatchObject({ hidden: true, body: "" });
    expect(hidden.body).toBe("Our price is 300."); // still in the log for staff
    await setMessageHidden(sent.message.id, staff.id, false);
    expect(toChatMessage((await listMessages(conv.id))[0]).body).toBe("Our price is 300.");

    // Past the retention period a message can be purged.
    await db.execute(sql`alter table conversation_messages disable trigger conversation_messages_append_only`);
    await db.update(conversationMessages).set({ createdAt: sql`now() - interval '25 months'` }).where(eq(conversationMessages.id, sent.message.id));
    await db.execute(sql`alter table conversation_messages enable trigger conversation_messages_append_only`);
    await db.delete(conversationMessages).where(eq(conversationMessages.id, sent.message.id));
    expect(await listMessages(conv.id)).toHaveLength(0);
  });

  it("allows erasing a whole conversation (account deletion) through the cascade", async () => {
    const { request } = await newRequest("client-erase");
    await submitProposal(b, request.id, proposal);
    const conv = (await openRequestConversation(request.id, b.id))!;
    await sendMessage(conv, "client", "Hello", { visitorId: "client-erase" });
    const db = await getDb();
    await db.delete(conversations).where(eq(conversations.id, conv.id));
    expect(await getConversation(conv.id)).toBeNull();
  });

  it("refuses closed conversations and emails the agency at most every 15 minutes", async () => {
    const { request } = await newRequest("client-mail");
    await submitProposal(b, request.id, proposal);
    const conv = (await openRequestConversation(request.id, b.id))!;
    await sendMessage(conv, "client", "First", { visitorId: "client-mail" });
    const emailedAt = (await getConversation(conv.id))!.agencyEmailedAt;
    expect(emailedAt).not.toBeNull();
    await sendMessage(conv, "client", "Second", { visitorId: "client-mail" });
    expect((await getConversation(conv.id))!.agencyEmailedAt?.getTime()).toBe(emailedAt!.getTime());
    expect(await sendMessage({ ...conv, status: "closed" }, "client", "Third", { visitorId: "client-mail" })).toEqual({ error: "closed" });
  });

  it("rate-limits bursts", async () => {
    const { request } = await newRequest("client-burst");
    await submitProposal(b, request.id, proposal);
    const conv = (await openRequestConversation(request.id, b.id))!;
    const results = [];
    for (let i = 0; i < 21; i++) results.push(await sendMessage(conv, "client", `m${i}`, { visitorId: "client-burst" }));
    expect(results.at(-1)).toEqual({ error: "rateLimited" });
  });
});

describe("notifications", () => {
  it("tells invited agencies, the client on a new quote, and agencies on the decision", async () => {
    const { request } = await newRequest("client-notes");
    const invitedA = (await listNotifications({ agencyId: a.id })).find((n) => n.requestId === request.id);
    expect(invitedA).toMatchObject({ kind: "request_invited", href: `/studio/opportunities/${request.id}`, params: { services: "ads_meta" } });

    await submitProposal(a, request.id, proposal);
    const p2 = await submitProposal(b, request.id, { ...proposal, priceJod: 250 });
    const received = (await listNotifications({ visitorId: "client-notes" })).filter((n) => n.kind === "proposal_received");
    expect(received.map((n) => n.params.name).sort()).toEqual(["Agency chat.alpha", "Agency chat.beta"]);
    expect(received[0].href).toBe(`/requests/${request.id}`);
    // No phone number or email ever goes into a notification.
    expect(JSON.stringify(received)).not.toContain("+962");

    if (!("proposal" in p2) || !p2.proposal) throw new Error("expected a proposal");
    await setProposalStatus(request.id, p2.proposal.id, "accepted");
    const forB = (await listNotifications({ agencyId: b.id })).filter((n) => n.requestId === request.id);
    expect(forB.map((n) => n.kind)).toContain("proposal_accepted");
    const forA = (await listNotifications({ agencyId: a.id })).filter((n) => n.requestId === request.id);
    expect(forA.map((n) => n.kind)).toContain("proposal_declined");
    expect(forA.find((n) => n.kind === "proposal_declined")?.params).toEqual({ name: "Rana" });
  });

  it("collapses a burst of chat messages into one notification and clears it on reading", async () => {
    const { request } = await newRequest("client-burst-notes");
    await submitProposal(a, request.id, proposal);
    const conv = (await openRequestConversation(request.id, a.id))!;
    await markNotificationsRead({ agencyId: a.id });
    await sendMessage(conv, "client", "One", { visitorId: "client-burst-notes" });
    await sendMessage(conv, "client", "Two", { visitorId: "client-burst-notes" });
    const unread = (await listNotifications({ agencyId: a.id })).filter((n) => n.conversationId === conv.id && !n.readAt);
    expect(unread).toHaveLength(1);
    expect(unread[0]).toMatchObject({ kind: "message", href: `/studio/messages/${conv.id}`, params: { name: "Rana", count: 2 } });
    expect(await unreadNotificationCount({ agencyId: a.id })).toBe(1);
    await markRead((await getConversation(conv.id))!, "agency", Number.MAX_SAFE_INTEGER);
    expect(await unreadNotificationCount({ agencyId: a.id })).toBe(0);

    await sendMessage(conv, "agency", "Hi Rana", { userId: a.userId });
    const client = (await listNotifications({ visitorId: "client-burst-notes" })).find((n) => n.kind === "message");
    expect(client).toMatchObject({ href: `/chats/${conv.id}`, params: { name: "Agency chat.alpha", count: 1 } });
  });

  it("turns an inquiry into a conversation and notifies the agency", async () => {
    const inquiry = await createInquiry({ agencyId: b.id, name: "Omar", phone: "+962791234567", message: "Do you do TikTok ads?", visitorId: "client-inquiry" });
    const [row] = await listVisitorConversations("client-inquiry");
    expect(row.conversation.inquiryId).toBe(inquiry.id);
    expect(row.conversation.clientName).toBe("Omar");
    expect((await listMessages(row.conversation.id)).map((m) => [m.side, m.body])).toEqual([["client", "Do you do TikTok ads?"]]);
    const note = (await listNotifications({ agencyId: b.id })).find((n) => n.kind === "inquiry");
    expect(note).toMatchObject({ conversationId: row.conversation.id, params: { name: "Omar" } });
    expect(JSON.stringify(note)).not.toContain("+962");
    expect((await listAgencyConversations(b.id)).find((r) => r.conversation.id === row.conversation.id)?.unread).toBe(true);
  });
});

describe("opportunities feed", () => {
  it("counts new matches until opened and hides demo requests from real agencies", async () => {
    const { request } = await newRequest("client-feed", [a]);
    const before = await newOpportunityCount(a);
    expect(before).toBeGreaterThan(0);
    expect((await listOpportunities(a)).find((o) => o.request.id === request.id)?.isNew).toBe(true);
    await markOpportunityViewed(a.id, request.id);
    expect(await newOpportunityCount(a)).toBe(before - 1);
    expect((await listOpportunities(a)).find((o) => o.request.id === request.id)?.isNew).toBe(false);

    const seeded = await newRequest("client-demo", [demo, a], "demo");
    expect((await listOpportunities(a)).some((o) => o.request.id === seeded.request.id)).toBe(false);
    expect((await listOpportunities(b)).some((o) => o.request.id === seeded.request.id)).toBe(false);
    expect((await listOpportunities(demo)).some((o) => o.request.id === seeded.request.id)).toBe(true);
    expect(await newOpportunityCount(a)).toBe(before - 1); // the demo match doesn't count
    // Only the demo agency hears about a demo request.
    expect((await listNotifications({ agencyId: demo.id })).some((n) => n.requestId === seeded.request.id)).toBe(true);
    expect((await listNotifications({ agencyId: a.id })).some((n) => n.requestId === seeded.request.id)).toBe(false);
    expect(await submitProposal(a, seeded.request.id, proposal)).toEqual({ error: "closed" });
  });
});

describe("polling rhythm", () => {
  it("polls fast while active, slower when idle", () => {
    expect(pollDelay(0)).toBe(POLL_ACTIVE_MS);
    expect(pollDelay(2 * 60_000)).toBe(POLL_IDLE_MS);
    expect(pollDelay(10 * 60_000)).toBe(POLL_AWAY_MS);
  });
});

describe("staff access to transcripts", () => {
  it("is limited to owner, admin and support", () => {
    for (const role of ["owner", "admin", "support"]) expect(can(role, "conversations.view")).toBe(true);
    for (const role of ["backbone", "maintenance", "agency", undefined]) expect(can(role, "conversations.view")).toBe(false);
  });
});
