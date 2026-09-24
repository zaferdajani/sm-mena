// Who may do what in the admin console. Pure data, unit tested.
//
// owner:       the platform owner. Everything, and the only role that can
//              manage staff, export money data, remove demo data or transfer
//              ownership. Nobody else can demote, disable or remove an owner.
// admin:       day-to-day operations incl. payments and disputes; no staff management.
// backbone:    core engineering: health, statistics, error journal, audit log, read-only users/agencies.
// maintenance: keeps things running: health, statistics, error journal and user reports.
// support:     helps people: users and agencies (read), verification and moderation, user reports,
//              chat transcripts (read-only, audited; docs/23-chat-and-notifications.md).

export const STAFF_ROLES = ["owner", "admin", "backbone", "maintenance", "support"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
/** Roles the owner can give through invitations or role changes (ownership moves only by transfer). */
export const ASSIGNABLE_ROLES = ["admin", "backbone", "maintenance", "support"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const PERMISSIONS = [
  "dashboard.view",
  "system.view",
  "stats.view",
  "bugs.manage",
  "support.manage",
  "agencies.view",
  "agencies.moderate",
  "agencies.plan",
  "content.moderate",
  "promotions.manage",
  "payments.view",
  "payments.manage",
  "payments.export",
  "escrow.resolve",
  "users.view",
  "users.reset_mfa",
  "audit.view",
  "staff.manage",
  "demo.remove",
  "appearance.manage",
  "conversations.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<StaffRole, Permission[]> = {
  owner: [...PERMISSIONS],
  admin: PERMISSIONS.filter((p) => !["staff.manage", "payments.export", "demo.remove"].includes(p)),
  backbone: ["dashboard.view", "system.view", "stats.view", "bugs.manage", "support.manage", "agencies.view", "users.view", "audit.view"],
  maintenance: ["dashboard.view", "system.view", "stats.view", "bugs.manage", "support.manage"],
  support: ["dashboard.view", "support.manage", "agencies.view", "agencies.moderate", "content.moderate", "users.view", "conversations.view"],
};

export const isStaffRole = (role: string | null | undefined): role is StaffRole => (STAFF_ROLES as readonly string[]).includes(role ?? "");

export function can(role: string | null | undefined, permission: Permission): boolean {
  return isStaffRole(role) && MATRIX[role].includes(permission);
}

export const permissionsOf = (role: StaffRole) => MATRIX[role];
