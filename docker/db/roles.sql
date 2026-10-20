-- Sets the built-in Supabase roles to the local POSTGRES_PASSWORD.
\set pgpass `echo "$POSTGRES_PASSWORD"`

SELECT set_config('app.pgpass', :'pgpass', false);

DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'authenticator',
    'pgbouncer',
    'supabase_auth_admin',
    'supabase_functions_admin',
    'supabase_storage_admin'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', r, current_setting('app.pgpass'));
    END IF;
  END LOOP;
END $$;

-- GoTrue must use the auth schema for its own migrations/tables.
ALTER ROLE supabase_auth_admin SET search_path TO auth, public, extensions;
ALTER ROLE postgres SET search_path TO public, auth, extensions;
