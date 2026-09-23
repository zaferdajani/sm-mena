// Local development seed. Sprint 1 fills this with services from the
// taxonomy plus fake agencies and briefs.
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
    process.exit(1);
  }
  console.log("Nothing to seed yet. Sprint 1 adds the schema and seed data.");
}

main();
