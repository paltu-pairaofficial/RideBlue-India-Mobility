-- RideBlue Supabase reconciliation: READ-ONLY inspection only.
-- This file contains SELECTs against PostgreSQL catalogs and application tables.
-- It does not create, alter, update, delete, or seed anything.
-- Run sections individually in Supabase SQL Editor and save the result sets.
-- Never paste service-role keys, database passwords, or payment secrets into SQL.

-- 1) Which competing model objects currently exist?
WITH expected(object_name) AS (
  VALUES
    ('profiles'), ('drivers'), ('rides'), ('ride_stops'), ('payments'),
    ('reviews'), ('promo_codes'), ('support_tickets'), ('support_messages'),
    ('emergency_events'), ('notifications'), ('fare_rules'), ('platform_settings'),
    ('airport_levy_rules'), ('ride_toll_adjustments'), ('driver_locations'),
    ('processed_payment_webhooks'), ('payment_refunds'), ('financial_audit_events'),
    ('public_driver_directory'), ('bookings'), ('driver_profiles')
)
SELECT object_name, to_regclass(format('public.%I', object_name)) AS resolved_object,
       to_regclass(format('public.%I', object_name)) IS NOT NULL AS exists_in_public
FROM expected
ORDER BY object_name;

-- 2) Actual columns, types, nullability, defaults for the tables that distinguish the models.
SELECT table_name, ordinal_position, column_name, data_type, udt_schema, udt_name,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles','drivers','rides','bookings','driver_profiles','payments',
    'support_tickets','support_messages','fare_rules','notifications',
    'driver_locations','processed_payment_webhooks','airport_levy_rules',
    'ride_toll_adjustments','payment_refunds','financial_audit_events'
  )
ORDER BY table_name, ordinal_position;

-- 3) Enum types and their exact values (important for payment_method and status compatibility).
SELECT n.nspname AS type_schema, t.typname AS enum_name, e.enumsortorder, e.enumlabel
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- 4) Constraints on the important tables: PK, FK, UNIQUE, CHECK and exclusion constraints.
SELECT ns.nspname AS schema_name, tbl.relname AS table_name, con.conname,
       con.contype, pg_get_constraintdef(con.oid, true) AS definition,
       con.convalidated
FROM pg_constraint con
JOIN pg_class tbl ON tbl.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
WHERE ns.nspname = 'public'
  AND tbl.relname IN (
    'profiles','drivers','rides','bookings','driver_profiles','payments',
    'reviews','support_tickets','support_messages','notifications','fare_rules',
    'driver_locations','processed_payment_webhooks','airport_levy_rules',
    'ride_toll_adjustments','payment_refunds','financial_audit_events'
  )
ORDER BY tbl.relname, con.contype, con.conname;

-- 5) Indexes on the same tables.
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles','drivers','rides','bookings','driver_profiles','payments',
    'reviews','support_tickets','support_messages','notifications','fare_rules',
    'driver_locations','processed_payment_webhooks','airport_levy_rules',
    'ride_toll_adjustments','payment_refunds','financial_audit_events'
  )
ORDER BY tablename, indexname;

-- 6) RLS enabled/forced state for public tables and views.
SELECT n.nspname AS schema_name, c.relname AS object_name,
       c.relkind, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p','v','m')
  AND c.relname IN (
    'profiles','drivers','rides','bookings','driver_profiles','payments',
    'reviews','promo_codes','support_tickets','support_messages','emergency_events',
    'notifications','fare_rules','platform_settings','airport_levy_rules',
    'ride_toll_adjustments','driver_locations','processed_payment_webhooks',
    'payment_refunds','financial_audit_events','public_driver_directory'
  )
ORDER BY c.relname;

-- 7) RLS policies, including permissive/restrictive mode, command, role, USING and WITH CHECK.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8) Definitions/security attributes of key functions. Review before changing or replacing them.
SELECT n.nspname AS function_schema, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_function_result(p.oid) AS result_type,
       p.prosecdef AS security_definer, p.provolatile AS volatility,
       p.proconfig AS function_settings,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'current_profile_id','is_admin','current_driver_id','is_approved_driver',
    'handle_new_user','handle_new_rideblue_user','prevent_profile_role_escalation',
    'calculate_fare_quote','calculate_fare_quote_v2','create_ride_with_fare_quote',
    'create_ride_with_fare_quote_v2','accept_ride_request','cancel_booking',
    'record_verified_razorpay_payment','emit_ride_notifications',
    'enforce_ride_integrity_and_transitions','validate_driver_location_trip'
  )
ORDER BY p.proname, arguments;

-- 9) Triggers on auth.users and RideBlue tables; this detects duplicate signup/profile triggers.
SELECT n.nspname AS table_schema, c.relname AS table_name, t.tgname AS trigger_name,
       t.tgenabled, pg_get_triggerdef(t.oid, true) AS trigger_definition,
       pn.nspname AS function_schema, p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace pn ON pn.oid = p.pronamespace
WHERE NOT t.tgisinternal
  AND (
    (n.nspname = 'auth' AND c.relname = 'users')
    OR (n.nspname = 'public' AND c.relname IN (
      'profiles','drivers','rides','payments','driver_locations',
      'fare_rules','airport_levy_rules','notifications','payment_refunds'
    ))
  )
ORDER BY n.nspname, c.relname, t.tgname;

-- 10) Grants on relevant public tables/views.
SELECT grantee, table_schema, table_name, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles','drivers','rides','bookings','driver_profiles','payments',
    'reviews','support_tickets','support_messages','notifications','fare_rules',
    'driver_locations','processed_payment_webhooks','airport_levy_rules',
    'ride_toll_adjustments','payment_refunds','financial_audit_events',
    'public_driver_directory'
  )
ORDER BY table_name, grantee, privilege_type;

-- 11) Realtime publication membership.
SELECT pub.pubname, n.nspname AS schema_name, c.relname AS table_name
FROM pg_publication pub
JOIN pg_publication_rel pr ON pr.prpubid = pub.oid
JOIN pg_class c ON c.oid = pr.prrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE pub.pubname = 'supabase_realtime'
ORDER BY n.nspname, c.relname;

-- 12) Profile-to-auth mapping counts only; does not return names, emails or IDs.
-- Works whether the profile table has a user_id column or uses id=auth.users.id.
SELECT
  (SELECT count(*) FROM auth.users) AS auth_user_count,
  (SELECT count(*) FROM public.profiles) AS profile_count,
  (SELECT count(*) FROM auth.users u WHERE EXISTS (
     SELECT 1 FROM public.profiles p WHERE to_jsonb(p)->>'user_id' = u.id::text
   )) AS profiles_matched_by_user_id,
  (SELECT count(*) FROM auth.users u WHERE EXISTS (
     SELECT 1 FROM public.profiles p WHERE to_jsonb(p)->>'id' = u.id::text
   )) AS profiles_matched_by_profile_id;

-- 13) Migration history table presence. This is inspection only.
SELECT to_regclass('supabase_migrations.schema_migrations') AS cli_migration_history_table;

-- Only if the previous query returns a table name, run this separately:
-- SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;

-- 14) Row counts for active core tables known to exist in the supplied inventory.
-- This query intentionally does not reference optional/legacy tables that may be absent.
SELECT 'profiles' AS table_name, count(*) AS row_count FROM public.profiles
UNION ALL SELECT 'drivers', count(*) FROM public.drivers
UNION ALL SELECT 'rides', count(*) FROM public.rides
UNION ALL SELECT 'payments', count(*) FROM public.payments
UNION ALL SELECT 'reviews', count(*) FROM public.reviews;

-- Optional legacy counts, only run individually if section 1 reports the object exists:
-- SELECT count(*) AS bookings_count FROM public.bookings;
-- SELECT count(*) AS driver_profiles_count FROM public.driver_profiles;
