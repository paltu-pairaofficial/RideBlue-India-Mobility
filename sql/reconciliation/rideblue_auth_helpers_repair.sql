-- RideBlue targeted auth-helper repair
-- Creates ONLY the two helper functions confirmed missing in the user's function inventory:
--   public.is_admin()
--   public.current_driver_id()
-- Does NOT alter tables, data, policies, triggers, or existing current_profile_id().
-- Run in Supabase SQL Editor after reviewing the preflight checks below.

BEGIN;

DO $preflight$
DECLARE
  v_missing text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    v_missing := array_append(v_missing, 'table public.profiles');
  END IF;
  IF to_regclass('public.drivers') IS NULL THEN
    v_missing := array_append(v_missing, 'table public.drivers');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles'
      AND column_name='user_id' AND data_type='text'
  ) THEN
    v_missing := array_append(v_missing, 'public.profiles.user_id TEXT');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles'
      AND column_name='role'
  ) THEN
    v_missing := array_append(v_missing, 'public.profiles.role column');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='drivers'
      AND column_name='profile_id' AND data_type='uuid'
  ) THEN
    v_missing := array_append(v_missing, 'public.drivers.profile_id UUID');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='drivers'
      AND column_name='approval_status'
  ) THEN
    v_missing := array_append(v_missing, 'public.drivers.approval_status column');
  END IF;

  IF cardinality(v_missing) > 0 THEN
    RAISE EXCEPTION 'RIDEBLUE AUTH HELPER REPAIR STOPPED. Required schema does not match active migrations: %', array_to_string(v_missing, ', ');
  END IF;
END;
$preflight$;

-- Keep function bodies aligned with src/supabase/migrations/02_auth_and_profiles.sql.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.user_id = auth.uid()::text
      AND p.role::text = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT d.id
  FROM public.drivers AS d
  JOIN public.profiles AS p ON p.id = d.profile_id
  WHERE p.user_id = auth.uid()::text
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_driver_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_driver_id() TO authenticated, service_role;

COMMIT;

-- After running, verify with:
-- SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
--        pg_get_function_result(p.oid) AS result
-- FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='public' AND p.proname IN ('current_profile_id','is_admin','current_driver_id')
-- ORDER BY p.proname;
