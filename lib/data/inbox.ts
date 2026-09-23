import { and, desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { inquiries, posts } from "@/lib/db/schema";

export async function listInquiries(agencyId: string, archived = false) {
  const db = await getDb();
  return db
    .select({ inquiry: inquiries, postCaption: posts.caption })
    .from(inquiries)
    .leftJoin(posts, eq(inquiries.postId, posts.id))
    .where(and(eq(inquiries.agencyId, agencyId), archived ? eq(inquiries.status, "archived") : ne(inquiries.status, "archived")))
    .orderBy(desc(inquiries.createdAt))
    .limit(200);
}

export async function unreadCount(agencyId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(inquiries)
    .where(and(eq(inquiries.agencyId, agencyId), eq(inquiries.status, "new")));
  return row?.n ?? 0;
}

export async function setInquiryStatus(agencyId: string, inquiryId: string, status: "new" | "read" | "archived") {
  const db = await getDb();
  const rows = await db
    .update(inquiries)
    .set({ status })
    .where(and(eq(inquiries.id, inquiryId), eq(inquiries.agencyId, agencyId)))
    .returning({ id: inquiries.id });
  return rows.length > 0;
}

export async function markAllRead(agencyId: string) {
  const db = await getDb();
  await db.update(inquiries).set({ status: "read" }).where(and(eq(inquiries.agencyId, agencyId), eq(inquiries.status, "new")));
}
