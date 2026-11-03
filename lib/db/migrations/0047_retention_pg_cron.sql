-- Database-side retention (docs/08-legal-compliance.md). The daily app job (/api/cron/retention)
-- already purges chats, notifications, support reports and staged images; these jobs cover what
-- it does not: expired sessions, analytics counters and error traces. They only run when the
-- pg_cron extension is available (Supabase: Database -> Extensions -> pg_cron); on PGlite and plain
-- Postgres this migration does nothing. Idempotent: re-running replaces the jobs by name.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron is not available; retention jobs skipped (the app cron still runs).';
    RETURN;
  END IF;
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule('sawwiq-retention-sessions', '23 3 * * *', $job$DELETE FROM public.sessions WHERE expires_at < now()$job$);
  PERFORM cron.schedule('sawwiq-retention-page-views', '29 3 * * *', $job$DELETE FROM public.page_views WHERE created_at < now() - interval '13 months'$job$);
  PERFORM cron.schedule('sawwiq-retention-events', '31 3 * * *', $job$DELETE FROM public.events WHERE created_at < now() - interval '26 months'$job$);
  PERFORM cron.schedule('sawwiq-retention-error-events', '37 3 * * *', $job$DELETE FROM public.error_events WHERE last_seen_at < now() - interval '12 months'$job$);
END $$;
