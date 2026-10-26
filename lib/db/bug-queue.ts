// Bug queue workflow (docs/61). QUEUE_ACTION=export writes bug-queue.sealed.json:
// new problem reports (with screenshots) and unresolved errors, contact details
// removed, encrypted to QUEUE_PUBKEY. QUEUE_ACTION=update applies QUEUE_UPDATES
// (the agent's statuses, notes and fix commits) and writes an audit entry each.
import { writeFileSync } from "node:fs";
import { and, desc, eq, inArray } from "drizzle-orm";
import { closeDb, getDb } from "./index";
import { auditLogs, errorEvents, supportRequests, users } from "./schema";
import { queueUpdates, redactContact, seal, type QueueBundle } from "../bug-queue";
import { storage } from "../storage";

const ref = (id: string) => id.slice(0, 8).toUpperCase();

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
    const media = [];
    for (const a of r.attachments) {
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
  };
  writeFileSync("bug-queue.sealed.json", JSON.stringify(seal(bundle, publicKey)));
  // Counts only: the log is public.
  console.log(`Sealed ${reports.length} report(s) and ${errors.length} error(s) for the bug agent.`);
}

async function applyUpdates() {
  const updates = queueUpdates.parse(JSON.parse(process.env.QUEUE_UPDATES || "[]"));
  const db = await getDb();
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
(action === "export" ? exportQueue() : action === "update" ? applyUpdates() : Promise.reject(new Error("QUEUE_ACTION must be export or update.")))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
