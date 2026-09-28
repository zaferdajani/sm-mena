// Maintenance → errors-report: the open entries of Admin → Bugs, oldest last
// sighting first, so fixed causes (no sighting since the fix) stand apart
// from errors that still happen. Read-only; messages are cut short.
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");
const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  const rows = await sql`
    select id, source, kind, coalesce(path, '') as path, occurrences,
           to_char(first_seen_at at time zone 'UTC', 'MM-DD HH24:MI') as first_seen,
           to_char(last_seen_at at time zone 'UTC', 'MM-DD HH24:MI') as last_seen,
           left(regexp_replace(message, '\\s+', ' ', 'g'), 110) as message
    from error_events where status in ('open', 'investigating')
    order by last_seen_at desc`;
  console.log(`Open errors: ${rows.length}`);
  for (const r of rows) {
    console.log(`#${r.id} ${r.source}/${r.kind} ${r.path} ×${r.occurrences} first ${r.first_seen} last ${r.last_seen} UTC :: ${r.message}`);
  }
  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
