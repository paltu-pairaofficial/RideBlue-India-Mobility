-- ====================================================================
-- RIDEBLUE: Supabase Authentication, Profile Linking & Privilege Control
-- Migration 02: Auth Triggers, Role Escalation Protection & Profile RLS
-- Execution Order: 2 of 3
-- Safety: Safe for existing databases (idempotent, preserves user data)
-- ====================================================================

-- 1. Security Helper Functions
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()::text LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()::text AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id FROM public.drivers d
  JOIN public.profiles p ON d.profile_id = p.id
  WHERE p.user_id = auth.uid()::text LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_approved_driver()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers d
    JOIN public.profiles p ON d.profile_id = p.id
    WHERE p.user_id = auth.uid()::text AND d.approval_status = 'approved'
  );
$$;

-- 2. New User Registration Trigger: Auto-link auth.users to public.profiles & pending drivers
CREATE OR REPLACE FUNCTION public.handle_new_rideblue_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_role text;
  v_full_name text;
  v_phone text;
  v_profile_id uuid;
BEGIN
  v_requested_role := coalesce(new.raw_user_meta_data->>'requested_role', 'rider');
  -- Public self-registration can only request 'rider' or 'driver'. Never 'admin'.
  IF v_requested_role NOT IN ('rider', 'driver') THEN
    v_requested_role := 'rider';
  END IF;

  v_full_name := coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1));
  v_phone := coalesce(new.raw_user_meta_data->>'phone', '');

  -- Insert or update profile
  INSERT INTO public.profiles (user_id, email, full_name, phone, role)
  VALUES (new.id::text, new.email, v_full_name, v_phone, v_requested_role::public.user_role)
  ON CONFLICT (user_id) DO UPDATE SET
    email = excluded.email,
    full_name = CASE WHEN profiles.full_name = '' THEN excluded.full_name ELSE profiles.full_name END,
    phone = CASE WHEN profiles.phone = '' THEN excluded.phone ELSE profiles.phone END
  RETURNING id INTO v_profile_id;

  -- If registered as a driver, provision a pending driver fleet record if none exists
  IF v_requested_role = 'driver' AND v_profile_id IS NOT NULL THEN
    INSERT INTO public.drivers (profile_id, approval_status, vehicle_category)
    VALUES (v_profile_id, 'pending'::public.driver_status, 'sedan'::public.vehicle_category)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_rideblue ON auth.users;
CREATE TRIGGER on_auth_user_created_rideblue
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_rideblue_user();

-- 3. Prevent Account Owner Role Escalation Trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.role IS DISTINCT FROM old.role THEN
    -- Only trusted service_role or verified admins can change profile roles
    IF auth.uid() IS NOT NULL AND auth.uid()::text = old.user_id AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security violation: Profile role cannot be modified by account owner.';
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 4. Row Level Security for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Select policy: User views own profile; Admins view all; Approved drivers are publicly viewable;
-- Participants in shared rides can view each other's profiles.
CREATE POLICY "Users can view relevant profiles" ON public.profiles
  FOR SELECT TO authenticated, anon
  USING (
    -- Own profile
    user_id = auth.uid()::text
    -- Or Admin
    OR public.is_admin()
    -- Or Approved Driver profile (needed for booking and driver display)
    OR id IN (SELECT profile_id FROM public.drivers WHERE approval_status = 'approved')
    -- Or Shared Ride participant (rider views assigned driver's profile; driver views passenger's profile)
    OR id IN (
      SELECT r.rider_id FROM public.rides r
      WHERE r.driver_id = public.current_driver_id()
    )
    OR id IN (
      SELECT d.profile_id FROM public.drivers d
      JOIN public.rides r ON r.driver_id = d.id
      WHERE r.rider_id = public.current_profile_id()
    )
  );

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own profile fields" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text OR public.is_admin())
  WITH CHECK (user_id = auth.uid()::text OR public.is_admin());
