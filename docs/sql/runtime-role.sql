-- Run with psql as the schema owner, in the DoneToday database only:
-- psql ... -v runtime_role=donetoday_runtime -f docs/sql/runtime-role.sql
-- Create a separate LOGIN role privately first. Never grant it owner membership.
\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('donetoday.runtime_role', :'runtime_role', true);
DO $$
DECLARE runtime text := current_setting('donetoday.runtime_role');
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime)
       OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolreplication))
       OR has_schema_privilege(runtime, 'public', 'CREATE')
       OR has_database_privilege(runtime, current_database(), 'CREATE')
       OR EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND pg_has_role(runtime, tableowner, 'MEMBER')) THEN
        RAISE EXCEPTION 'Runtime role must not own the schema, inherit an owner role, or have DDL/administrative privileges';
    END IF;
END $$;
GRANT CONNECT ON DATABASE :"DBNAME" TO :"runtime_role";
GRANT USAGE ON SCHEMA public TO :"runtime_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"runtime_role";
REVOKE INSERT, UPDATE, DELETE ON TABLE public."__EFMigrationsHistory" FROM :"runtime_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"runtime_role";
-- Defaults apply to objects subsequently created by the role running this script.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"runtime_role";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO :"runtime_role";
COMMIT;
