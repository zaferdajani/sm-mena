// Creates (or refreshes) the App Store / Google Play reviewer account.
//   DEMO_EMAIL=... DEMO_PASSWORD=... npm run seed:demo-account
// Credentials come from the environment only; nothing is committed. The app
// uses its own users table (not Supabase Auth), so this script writes through
// the same data layer as the sign-up form. It targets whichever database
// DATABASE_URL points at (PGlite when unset), so run it deliberately.
import { eq } from "drizzle-orm";
import { createAgency, getAgencyByOwner } from "../lib/data/agencies";
import { createUser, getUserByEmail } from "../lib/data/users";
import { hashPassword } from "../lib/auth/password";
import { getDb } from "../lib/db";
import { users } from "../lib/db/schema";

const email = process.env.DEMO_EMAIL?.trim().toLowerCase();
const password = process.env.DEMO_PASSWORD;
const handle = (process.env.DEMO_HANDLE ?? "app-review").toLowerCase();

async function main() {
  if (!email || !password || password.length < 12) {
    console.error("Set DEMO_EMAIL and DEMO_PASSWORD (12+ characters).");
    process.exit(1);
  }
  const db = await getDb();
  const existing = await getUserByEmail(email);
  const user = existing ?? (await createUser(email, password, "agency", { ageConfirmed: true }));
  if (existing) {
    await db.update(users).set({ passwordHash: await hashPassword(password), disabledAt: null }).where(eq(users.id, existing.id));
  }
  if (!(await getAgencyByOwner(user.id))) {
    await createAgency(user.id, {
      handle,
      name: "App Review Studio",
      bio: "Demo agency for store reviewers. Not a real business.",
      city: "Amman",
      services: [],
      languages: ["ar", "en"],
    });
  }
  console.log(`Reviewer account ready for ${handle}. Sign in at /signin with DEMO_EMAIL.`);
  process.exit(0);
}

void main();
