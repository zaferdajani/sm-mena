// Bug queue workflow (docs/61). QUEUE_ACTION=export writes bug-queue.sealed.json:
// new problem reports (with screenshots) and unresolved errors, contact details
// removed, encrypted to QUEUE_PUBKEY. QUEUE_ACTION=update applies QUEUE_UPDATES
// (the agent's statuses, notes and fix commits) and QUEUE_REPLIES (its replies
// to reporters, sealed to the site's reply key: docs/63), with an audit entry each.
import { writeFileSync } from "node:fs";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { closeDb, getDb, type DB } from "./index";
import { appSettings, auditLogs, errorEvents, supportMessages, supportRequests, users } from "./schema";
import { newRunKeys, open, queueReplies, queueUpdates, redactContact, seal, type QueueBundle, type QueueReply, type SealedBundle } from "../bug-queue";
import { storage } from "../storage";

const ref = (id: string) => id.slice(0, 8).toUpperCase();
const REPLY_KEY = "bug_agent_reply_key";

/** The key pair the agent seals replies to. Made once and kept in the database, which is what it protects. */
async function replyKeys(db: DB) {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, REPLY_KEY));
  if (row) return row.value as { publicKey: string; privateKey: string };
  const keys = newRunKeys();
  await db.insert(appSettings).values({ key: REPLY_KEY, value: keys }).onConflictDoNothing();
  const [saved] = await db.select().from(appSettings).where(eq(appSettings.key, REPLY_KEY));
  return saved.value as { publicKey: string; privateKey: string };
}

async function exportQueue() {
  const publicKey = process.env.QUEUE_PUBKEY?.trim();
  if (!publicKey) throw new Error("Set QUEUE_PUBKEY (the agent's one-run public key).");
  const db = await getDb();
  const rows = await db
    .select({ r: supportRequests, role: users.role })
    .from(supportRequests)
    .leftJoin(users, eq(users.id, supportRequests.userId))
    .where(eq(supportRequests.status, "new"))
    .orderBy(supportRequests.createdAt)
    .limit(40);
  const reports: QueueBundle["reports"] = [];
  for (const { r, role } of rows) {
    const screenshots = [];
    for (const key of r.screenshots) {
      const body = await storage().get(key).catch(() => null);
      if (body) screenshots.push({ name: `${ref(r.id)}-${screenshots.length + 1}.webp`, base64: body.toString("base64") });
    }
    const thread = await db.select().from(supportMessages).where(eq(supportMessages.requestId, r.id)).orderBy(asc(supportMessages.createdAt));
    // Files sent later in the conversation join the report's own.
    for (const key of thread.flatMap((m) => m.screenshots)) {
      const body = await storage().get(key).catch(() => null);
      if (body) screenshots.push({ name: `${ref(r.id)}-${screenshots.length + 1}.webp`, base64: body.toString("base64") });
    }
    const media = [];
    for (const a of [...r.attachments, ...thread.flatMap((m) => m.attachments)]) {
      const body = await storage().get(a.key).catch(() => null);
      if (body) media.push({ name: `${ref(r.id)}-${a.kind}-${media.length + 1}.${a.key.split(".").pop()}`, kind: a.kind, base64: body.toString("base64") });
    }
    reports.push({
      id: r.id,
      ref: ref(r.id),
      kind: r.kind,
      message: redactContact(r.message),
      path: r.path,
      locale: r.locale,
      viewport: r.viewport,
      appCommit: r.appCommit,
      userAgent: r.userAgent,
      reporterRole: role ?? null,
      wantsReply: !!r.email,
      createdAt: r.createdAt.toISOString(),
      thread: thread.map((m) => ({ author: m.author as "reporter" | "agent" | "staff", body: m.author === "reporter" ? redactContact(m.body) : m.body, createdAt: m.createdAt.toISOString() })),
      screenshots,
      media,
    });
  }
  const errors = await db
    .select()
    .from(errorEvents)
    .where(inArray(errorEvents.status, ["open", "investigating"]))
    .orderBy(desc(errorEvents.lastSeenAt))
    .limit(40);
  const [planned] = await db.select({ id: supportRequests.id }).from(supportRequests).where(eq(supportRequests.status, "planned")).limit(1);
  const bundle: QueueBundle = {
    exportedAt: new Date().toISOString(),
    reports,
    errors: errors.map((e) => ({
      id: e.id,
      source: e.source,
      kind: e.kind,
      message: redactContact(e.message),
      stack: e.stack,
      path: e.path,
      userAgent: e.userAgent,
      occurrences: e.occurrences,
      status: e.status,
      firstSeenAt: e.firstSeenAt.toISOString(),
      lastSeenAt: e.lastSeenAt.toISOString(),
    })),
    waitingOnOwner: planned ? 1 : 0,
    replyKey: (await replyKeys(db)).publicKey,
  };
  writeFileSync("bug-queue.sealed.json", JSON.stringify(seal(bundle, publicKey)));
  // Counts only: the log is public.
  console.log(`Sealed ${reports.length} report(s) and ${errors.length} error(s) for the bug agent.`);
}

/** The agent's replies to reporters (docs/63): opened with the site's private reply key, then written to each conversation. */
async function applyReplies(db: DB) {
  const sealedText = process.env.QUEUE_REPLIES?.trim();
  if (!sealedText) return 0;
  const sealed = JSON.parse(Buffer.from(sealedText, "base64").toString("utf8")) as SealedBundle;
  const replies: QueueReply[] = queueReplies.parse(open<QueueReply[]>(sealed, (await replyKeys(db)).privateKey));
  const open_ = await db.select({ id: supportRequests.id }).from(supportRequests).where(inArray(supportRequests.status, ["new", "planned", "waiting", "done"]));
  let written = 0;
  for (const r of replies) {
    const match = open_.find((x) => ref(x.id) === r.ref);
    if (!match) {
      console.log(`::warning::No report ${r.ref} to reply to.`);
      continue;
    }
    await db.insert(supportMessages).values({ requestId: match.id, author: "agent", body: r.body });
    await db
      .update(supportRequests)
      .set({ reporterUnread: true, ...(r.status ? { status: r.status, handledAt: new Date(), handledBy: null } : {}), ...(r.commit ? { resolutionCommit: r.commit } : {}) })
      .where(eq(supportRequests.id, match.id));
    await db.insert(auditLogs).values({ actorUserId: null, action: "support.agent_reply", entity: "support_request", entityId: match.id, meta: { via: "bug-agent", status: r.status ?? null } });
    // Counts only: the log is public.
    console.log(`Reply on ${r.ref}${r.status ? ` → ${r.status}` : ""}`);
    written++;
  }
  return written;
}

/** Asks the site to send the emails that are now due (reply links, status emails); best effort. */
async function nudgeEmails() {
  const site = (process.env.SITE_URL || "https://sawwiq.org").replace(/\/$/, "");
  await fetch(`${site}/api/support/updates`, { method: "POST", signal: AbortSignal.timeout(20_000) }).then((r) => console.log(`Emails due: ${r.status}`)).catch(() => {});
}

async function applyUpdates() {
  const updates = queueUpdates.parse(JSON.parse(process.env.QUEUE_UPDATES || "[]"));
  const db = await getDb();
  await applyReplies(db);
  for (const u of updates) {
    if (u.type === "report") {
      const rows = await db.select({ id: supportRequests.id }).from(supportRequests).where(inArray(supportRequests.status, ["new", "planned"]));
      const match = rows.find((r) => ref(r.id) === u.ref);
      if (!match) {
        console.log(`::warning::No open report ${u.ref}.`);
        continue;
      }
      await db
        .update(supportRequests)
        .set({ status: u.status, adminNote: u.note, resolutionCommit: u.commit ?? null, handledBy: null, handledAt: new Date() })
        .where(eq(supportRequests.id, match.id));
      await db.insert(auditLogs).values({ actorUserId: null, action: `support.${u.status}`, entity: "support_request", entityId: match.id, meta: { via: "bug-agent", commit: u.commit ?? null } });
      console.log(`Report ${u.ref} → ${u.status}`);
    } else {
      const resolved = u.status !== "investigating";
      const done = await db
        .update(errorEvents)
        .set({ status: u.status, resolutionNotes: u.note, resolutionCommit: u.commit ?? null, resolvedAt: resolved ? new Date() : null, resolvedBy: null })
        .where(and(eq(errorEvents.id, u.id), inArray(errorEvents.status, ["open", "investigating"])))
        .returning({ id: errorEvents.id });
      if (!done.length) {
        console.log(`::warning::No unresolved error ${u.id}.`);
        continue;
      }
      await db.insert(auditLogs).values({ actorUserId: null, action: `bug.${u.status}`, entity: "error_event", entityId: String(u.id), meta: { via: "bug-agent", commit: u.commit ?? null } });
      console.log(`Error ${u.id} → ${u.status}`);
    }
  }
}

const action = process.env.QUEUE_ACTION;
(action === "export" ? exportQueue() : action === "update" ? applyUpdates().then(nudgeEmails) : Promise.reject(new Error("QUEUE_ACTION must be export or update.")))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
