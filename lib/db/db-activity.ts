// Maintenance → db-activity: what the live database is busy with right now.
// Prints connection states, waits and durations only; never row data, and
// query text is cut to its first words so no parameters show (docs/08).
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");
const sql = postgres(url, { max: 1, prepare: false });

const byState = await sql`
  select coalesce(state, 'none') as state, usename, application_name, count(*)::int as n,
         max(extract(epoch from now() - coalesce(xact_start, query_start)))::int as oldest_seconds
  from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid()
  group by 1, 2, 3 order by n desc`;
console.log("Connections by state:");
console.table(byState);

const slow = await sql`
  select pid, state, wait_event_type, wait_event,
         extract(epoch from now() - coalesce(xact_start, query_start))::int as seconds,
         left(regexp_replace(query, '\\s+', ' ', 'g'), 80) as query_start
  from pg_stat_activity
  where datname = current_database() and pid <> pg_backend_pid()
    and state <> 'idle' and now() - coalesce(xact_start, query_start) > interval '10 seconds'
  order by seconds desc limit 20`;
console.log("Busy for more than 10 seconds:");
console.table(slow);

const locks = await sql`select count(*)::int as waiting from pg_locks where not granted`;
console.log(`Lock requests waiting: ${locks[0].waiting}`);
const [settings] = await sql`select current_setting('max_connections') as max_connections,
  current_setting('idle_in_transaction_session_timeout') as idle_in_tx_timeout,
  current_setting('statement_timeout') as statement_timeout`;
console.log("Settings:", settings);
await sql.end();
