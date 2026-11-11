-- Row Level Security on every table in the public schema (docs/PRIVACY_COMPLIANCE_sm-menaRT.md).
--
-- Sawwiq reads and writes the database only from the server, through a direct Postgres
-- connection (drizzle, DATABASE_URL = the Supabase `postgres` role). That role owns the tables
-- and has BYPASSRLS on Supabase (and is a superuser on local Postgres and PGlite), so enabling RLS
-- does not change what the app can do. It is deliberately NOT forced (no FORCE ROW LEVEL SECURITY):
-- forcing would subject the owner role to the policies and break the app.
--
-- No policies are created. With RLS enabled and no policy, Supabase's `anon` and `authenticated`
-- roles (the public Data API / PostgREST) see no rows and can change none: deny-all. The app never
-- uses the Data API for tables (supabase-js is used for Storage only, with the service role).
-- Table privileges are revoked from those roles as a second layer.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', t.tablename);
  END LOOP;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
  END IF;
END $$;
