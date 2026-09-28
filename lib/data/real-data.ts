import { and, eq, inArray, isNull, notInArray, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { agencies, users } from "@/lib/db/schema";
import { STAFF_ROLES } from "@/lib/auth/permissions";

/**
 * What the admin statistics count as real (docs/51): agencies that are not
 * demo pages and not owned by a Sawwiq staff account (test pages). Anything
 * attached to another agency (its posts, views, clicks, messages, reviews,
 * quotes, reports) is left out, so the numbers show actual activity only.
 */
export function realAgencyIds(db: DB) {
  return db
    .select({ id: agencies.id })
    .from(agencies)
    .innerJoin(users, eq(users.id, agencies.ownerUserId))
    .where(and(eq(agencies.isDemo, false), notInArray(users.role, [...STAFF_ROLES])));
}

/** A row tied to a real agency. */
export const ofRealAgency = (db: DB, column: AnyColumn): SQL => inArray(column, realAgencyIds(db));

/** A row tied to a real agency, or to no agency at all (site-wide events such as the AI assistant). */
export const ofRealAgencyOrNone = (db: DB, column: AnyColumn): SQL => or(isNull(column), inArray(column, realAgencyIds(db)))!;

/** Page views of the admin console are the team at work, not visitor traffic. */
export const notAdminPath = (column: AnyColumn): SQL => sql`${column} !~ '^(/[a-z]{2})?/admin(/|$)'`;
