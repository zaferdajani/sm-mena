// Applies migrations to DATABASE_URL (production) or the local PGlite store.
import { syncServiceCatalog } from "../services/tags";
import { closeDb, getDb, MIGRATIONS_DIR } from "./index";

async function main() {
  if (process.env.DATABASE_URL) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(process.env.DATABASE_URL, { max: 1 });
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_DIR });
    await client.end();
    console.log("Migrations applied to DATABASE_URL.");
    // Built-in service tags (data/service-catalog.json) get their numbers.
    const synced = await syncServiceCatalog();
    await closeDb();
    console.log(`Service catalog: ${synced.added} added, ${synced.updated} updated.`);
    return;
  }
  await getDb(); // PGlite migrates on connect
  await syncServiceCatalog();
  await closeDb();
  console.log("Migrations applied to local PGlite store.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
