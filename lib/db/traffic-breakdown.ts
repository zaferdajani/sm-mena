// Maintenance → traffic-breakdown: how concentrated the last 30 days of admin
// statistics are — how many of the views, clicks and visitors come from the
// same browser. Sawwiq keeps no IP addresses; "same visitor" means the same
// anonymous browser ID (cookie). Read-only; prints counts and the first 6
// characters of a browser ID only (docs/08, docs/51).
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");
const sql = postgres(url, { max: 1, prepare: false });

// Same rule as lib/data/real-data.ts: no demo pages, no staff-owned test pages.
const REAL = sql`(select a.id from agencies a join users u on u.id = a.owner_user_id
  where not a.is_demo and u.role not in ('owner', 'admin', 'backbone', 'maintenance', 'support'))`;
const SINCE = sql`now() - interval '30 days'`;

async function main() {
  const byType = await sql`
    select type::text, count(*)::int as events, count(distinct visitor_id)::int as browsers,
           count(*) filter (where visitor_id is null)::int as no_browser_id
    from events
    where created_at >= ${SINCE} and (agency_id is null or agency_id in ${REAL})
    group by type order by events desc`;
  console.log("Events (what the dashboard counts), last 30 days:");
  console.table(byType);

  const top = await sql`
    select left(visitor_id, 6) as browser, count(*)::int as events,
           string_agg(distinct type::text, ', ') as types,
           min(created_at)::date::text as first, max(created_at)::date::text as last
    from events
    where created_at >= ${SINCE} and visitor_id is not null and (agency_id is null or agency_id in ${REAL})
    group by visitor_id order by events desc limit 15`;
  console.log("Busiest browsers (events):");
  console.table(top);

  const [spread] = await sql`
    with v as (
      select visitor_id, count(*) as n from events
      where created_at >= ${SINCE} and visitor_id is not null and (agency_id is null or agency_id in ${REAL})
      group by visitor_id)
    select count(*)::int as browsers,
           count(*) filter (where n = 1)::int as seen_once,
           count(*) filter (where n between 2 and 5)::int as two_to_five,
           count(*) filter (where n > 5)::int as more_than_five
    from v`;
  console.log("Browsers by number of events:");
  console.table([spread]);

  const pages = await sql`
    select count(*)::int as page_views, count(distinct visitor_id)::int as browsers,
           count(distinct session_id)::int as sessions,
           count(*) filter (where path ~ '^(/[a-z]{2})?/admin(/|$)')::int as admin_views
    from page_views where created_at >= ${SINCE}`;
  console.log("Page views (Statistics → Traffic), last 30 days:");
  console.table(pages);

  const topPages = await sql`
    select left(visitor_id, 6) as browser, count(*)::int as views, count(distinct session_id)::int as sessions,
           string_agg(distinct device, ', ') as device, bool_or(path ~ '^(/[a-z]{2})?/admin(/|$)') as opened_admin
    from page_views where created_at >= ${SINCE} and visitor_id is not null
    group by visitor_id order by views desc limit 15`;
  console.log("Busiest browsers (page views); opened_admin = a team member's browser:");
  console.table(topPages);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
