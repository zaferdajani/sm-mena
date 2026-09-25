// Clears two-factor sign-in for staff accounts so they can enrol again.
// Needed when MFA_ENCRYPTION_KEY changes: authenticator secrets sealed with
// the old key can't be read.
// Backup codes still work until this runs. GitHub Actions → Maintenance →
// reset-staff-2fa (docs/27-vercel.md). Agency accounts are not touched.
import { and, inArray, isNotNull } from "drizzle-orm";
import { STAFF_ROLES } from "../auth/permissions";
import { closeDb, getDb } from "./index";
import { users } from "./schema";

async function main() {
  const db = await getDb();
  const rows = await db
    .update(users)
    .set({ totpSecretEnc: null, totpPendingEnc: null, totpEnabledAt: null, totpLastStep: 0, backupCodeHashes: [] })
    .where(and(inArray(users.role, [...STAFF_ROLES]), isNotNull(users.totpEnabledAt)))
    .returning({ id: users.id });
  console.log(`Two-factor sign-in cleared for ${rows.length} staff account(s). They set it up again at their next sign-in.`);
}

main()
  .then(() => closeDb())
  .catch(async (error) => {
    console.error(error);
    await closeDb();
    process.exit(1);
  });
