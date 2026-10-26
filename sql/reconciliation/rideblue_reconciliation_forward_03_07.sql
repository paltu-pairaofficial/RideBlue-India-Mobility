-- RideBlue forward reconciliation for the ACTIVE rides/drivers schema.
-- Generated from migrations 03-07 in the uploaded project, with duplicate-policy guards
-- and two implicit data backfills removed. This is NOT for the legacy bookings/driver_profiles schema.
-- Review/backup first. Run in Supabase SQL Editor as project owner. Entire script is transactional.
-- If preflight raises an exception, no migration changes are committed; send the exact error.

BEGIN;

DO $preflight$
DECLARE
  missing text;
  bad_enum text;
BEGIN
  -- Require the active application's core model; refuse to mutate a legacy/incompatible schema.
  SELECT string_agg(req.table_name || '.' || req.column_name, ', ' ORDER BY req.table_name, req.column_name)
    INTO missing
  FROM (VALUES
    ('profiles','id'),('profiles','user_id'),('profiles','email'),('profiles','full_name'),('profiles','phone'),('profiles','role'),('profiles','rating'),('profiles','total_trips'),('profiles','updated_at'),
    ('drivers','id'),('drivers','profile_id'),('drivers','approval_status'),('drivers','acceptance_rate'),('drivers','is_online'),('drivers','current_lat'),('drivers','current_lng'),('drivers','updated_at'),
    ('rides','id'),('rides','booking_code'),('rides','rider_id'),('rides','driver_id'),('rides','status'),('rides','payment_status'),('rides','vehicle_category'),('rides','pickup_address'),('rides','destination_address'),('rides','scheduled_for'),('rides','created_at'),('rides','accepted_at'),('rides','started_at'),('rides','completed_at'),('rides','cancelled_at'),('rides','cancelled_by'),('rides','cancellation_fee'),('rides','emergency_sos_active'),('rides','emergency_sos_time'),('rides','pickup_lat'),('rides','pickup_lng'),('rides','destination_lat'),('rides','destination_lng'),('rides','passenger_count'),('rides','distance_km'),('rides','estimated_duration_min'),('rides','base_fare'),('rides','distance_fare'),('rides','time_fare'),('rides','toll_charges'),('rides','taxes'),('rides','discount'),('rides','total_fare'),('rides','payment_method'),('rides','refund_status'),
    ('ride_stops','id'),('ride_stops','ride_id'),('payments','id'),('payments','ride_id'),('payments','amount'),('payments','currency'),('payments','provider'),('payments','provider_transaction_id'),('payments','status'),('payments','refund_amount'),('payments','updated_at'),
    ('reviews','id'),('reviews','ride_id'),('reviews','rider_id'),('reviews','driver_id'),('reviews','rating'),('reviews','created_at'),
    ('support_tickets','id'),('support_tickets','user_id'),('support_tickets','status'),('support_messages','id'),('support_messages','ticket_id'),('support_messages','sender_id'),('emergency_events','id'),('emergency_events','ride_id'),('emergency_events','triggered_by')
  ) AS req(table_name,column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.table_name=req.table_name AND c.column_name=req.column_name
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'RIDEBLUE PREFLIGHT FAILED: active schema is missing required columns: %. No changes committed.', missing;
  END IF;

  IF to_regprocedure('public.current_profile_id()') IS NULL
     OR to_regprocedure('public.is_admin()') IS NULL
     OR to_regprocedure('public.current_driver_id()') IS NULL THEN
    RAISE EXCEPTION 'RIDEBLUE PREFLIGHT FAILED: required auth helper function(s) missing. Confirm migration 02 and inspect the live schema. No changes committed.';
  END IF;

  -- Check that the active enums exist and include values used by the migrations.
  SELECT string_agg(x.type_name || '=' || x.required_value, ', ')
  INTO bad_enum
  FROM (VALUES
    ('ride_status','driver_arriving'),('payment_method','razorpay'),('vehicle_category','airport_transfer'),('driver_status','approved')
  ) AS x(type_name, required_value)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    JOIN pg_enum e ON e.enumtypid=t.oid
    WHERE n.nspname='public' AND t.typname=x.type_name AND e.enumlabel=x.required_value
  );
  IF bad_enum IS NOT NULL THEN
    RAISE EXCEPTION 'RIDEBLUE PREFLIGHT FAILED: enum values missing: %. No changes committed.', bad_enum;
  END IF;
END;
$preflight$;

-- Dependency fix: this helper is referenced by RLS policies and triggers in migration 03,
-- so define it immediately after preflight and before those policies/triggers are created.
-- This matches the active rides/drivers schema and does not alter application data.
CREATE OR REPLACE FUNCTION public.is_approved_driver()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.drivers AS d
    JOIN public.profiles AS p ON p.id = d.profile_id
    WHERE p.user_id = auth.uid()::text
      AND d.approval_status = 'approved'
      AND d.is_online = true
  );
$$;

-- ===== Source migration 03_security_rls_and_state_machine.sql =====
-- ====================================================================
-- RIDEBLUE: Driver GPS Tracking, Payments, Idempotency & RLS Hardening
-- Migration 03: Telemetry, Payment Security, State Machine & Authorization
-- Execution Order: 3 of 3
-- Safety: Safe for existing databases (idempotent, preserves user data)
-- ====================================================================

-- ====================================================================
-- 1. Driver Locations Table (High-Frequency GPS Telemetry)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.driver_locations (
    ride_id UUID PRIMARY KEY REFERENCES public.rides(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    lat NUMERIC(9, 6) NOT NULL CHECK (lat BETWEEN 6.0 AND 37.5),
    lng NUMERIC(9, 6) NOT NULL CHECK (lng BETWEEN 68.0 AND 97.5),
    accuracy_m NUMERIC(10, 2),
    heading NUMERIC(7, 2),
    speed_mps NUMERIC(7, 2),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON public.driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_recorded_at ON public.driver_locations(recorded_at DESC);

-- ====================================================================
-- 2. Processed Payment Webhooks Table (Idempotency Audit)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.processed_payment_webhooks (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at ON public.processed_payment_webhooks(processed_at DESC);

-- ====================================================================
-- 3. Payment Index Optimization
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON public.payments(provider, provider_transaction_id);

-- ====================================================================
-- 4. Driver Privilege Escalation Protection Trigger (Priority 2)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.prevent_driver_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If not executed by an admin or service_role
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    -- Drivers cannot alter their own approval_status
    IF new.approval_status IS DISTINCT FROM old.approval_status THEN
      RAISE EXCEPTION 'Security violation: Drivers cannot modify their own verification or approval status.';
    END IF;

    -- Drivers cannot alter rejection_reason
    IF new.rejection_reason IS DISTINCT FROM old.rejection_reason THEN
      RAISE EXCEPTION 'Security violation: Rejection reasons can only be modified by administrators.';
    END IF;

    -- Drivers cannot alter acceptance_rate directly
    IF new.acceptance_rate IS DISTINCT FROM old.acceptance_rate THEN
      RAISE EXCEPTION 'Security violation: Acceptance rate is calculated by platform dispatch only.';
    END IF;

    -- Unapproved drivers cannot toggle is_online to TRUE
    IF old.approval_status <> 'approved' AND new.is_online = TRUE THEN
      RAISE EXCEPTION 'Security violation: Unapproved drivers cannot toggle availability to online.';
    END IF;
  END IF;

  new.updated_at := NOW();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_driver_privilege_escalation ON public.drivers;
CREATE TRIGGER trg_prevent_driver_privilege_escalation
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.prevent_driver_privilege_escalation();

-- ====================================================================
-- 5. Ride Status Transitions, Assignment & Anti-Tamper Trigger (Priorities 1 & 4)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.enforce_ride_integrity_and_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_user_profile_id uuid;
  v_user_driver_id uuid;
BEGIN
  -- Service role execution (e.g. background tasks or webhooks) bypasses client checks
  IF auth.uid() IS NULL THEN
    RETURN new;
  END IF;

  v_is_admin := public.is_admin();
  v_user_profile_id := public.current_profile_id();
  v_user_driver_id := public.current_driver_id();

  -- Allow administrators full management
  IF v_is_admin THEN
    RETURN new;
  END IF;

  -- ------------------------------------------------------------------
  -- RULE A: Terminal States (Cannot modify completed or cancelled rides)
  -- ------------------------------------------------------------------
  IF old.status IN ('completed', 'cancelled') AND new.status IS DISTINCT FROM old.status THEN
    RAISE EXCEPTION 'Illegal status transition: Completed or cancelled rides cannot be reopened.';
  END IF;

  -- ------------------------------------------------------------------
  -- RULE B: Rider Anti-Tampering Checks (Priority 1)
  -- ------------------------------------------------------------------
  IF v_user_profile_id = old.rider_id THEN
    -- Riders cannot modify payment status
    IF new.payment_status IS DISTINCT FROM old.payment_status THEN
      RAISE EXCEPTION 'Security violation: Riders cannot update payment status directly.';
    END IF;

    -- Riders cannot modify fare calculations
    IF (new.base_fare IS DISTINCT FROM old.base_fare) OR
       (new.distance_fare IS DISTINCT FROM old.distance_fare) OR
       (new.time_fare IS DISTINCT FROM old.time_fare) OR
       (new.toll_charges IS DISTINCT FROM old.toll_charges) OR
       (new.taxes IS DISTINCT FROM old.taxes) OR
       (new.discount IS DISTINCT FROM old.discount) OR
       (new.total_fare IS DISTINCT FROM old.total_fare) THEN
      RAISE EXCEPTION 'Security violation: Fare breakdown cannot be modified by rider.';
    END IF;

    -- Riders cannot reassign or remove drivers
    IF new.driver_id IS DISTINCT FROM old.driver_id THEN
      RAISE EXCEPTION 'Security violation: Drivers cannot be assigned or reassigned by riders.';
    END IF;

    -- Riders cannot change refund status
    IF new.refund_status IS DISTINCT FROM old.refund_status THEN
      RAISE EXCEPTION 'Security violation: Refund status cannot be modified by riders.';
    END IF;

    -- Rider status transitions: Riders can ONLY transition to 'cancelled'
    IF new.status IS DISTINCT FROM old.status THEN
      IF new.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Security violation: Riders can only cancel rides, not advance ride statuses.';
      END IF;

      -- Riders can only cancel if trip has not already started or completed
      IF old.status NOT IN ('requested', 'accepted') THEN
        RAISE EXCEPTION 'Cancellation denied: Rides cannot be cancelled once journey is underway.';
      END IF;

      new.cancelled_at := NOW();
      new.cancelled_by := 'rider';
    END IF;

    -- Allow Emergency SOS trigger
    IF new.emergency_sos_active = TRUE AND old.emergency_sos_active = FALSE THEN
      new.emergency_sos_time := NOW();
    END IF;

    RETURN new;
  END IF;

  -- ------------------------------------------------------------------
  -- RULE C: Driver Status Transitions & Assignment Checks (Priority 4)
  -- ------------------------------------------------------------------
  IF v_user_driver_id IS NOT NULL THEN
    -- Drivers cannot change fare amounts or payment status
    IF (new.payment_status IS DISTINCT FROM old.payment_status) OR
       (new.total_fare IS DISTINCT FROM old.total_fare) THEN
      RAISE EXCEPTION 'Security violation: Drivers cannot alter ride fares or payment status.';
    END IF;

    -- Case C1: Driver accepting a requested ride
    IF old.status = 'requested' AND new.status = 'accepted' THEN
      -- Must not already be assigned to another driver
      IF old.driver_id IS NOT NULL THEN
        RAISE EXCEPTION 'Ride conflict: This booking has already been claimed by another driver.';
      END IF;

      -- Must assign to own verified driver ID
      IF new.driver_id IS DISTINCT FROM v_user_driver_id THEN
        RAISE EXCEPTION 'Security violation: You can only assign rides to your own driver account.';
      END IF;

      -- Driver must be approved
      IF NOT public.is_approved_driver() THEN
        RAISE EXCEPTION 'Compliance restriction: Pending or rejected drivers cannot accept passenger bookings.';
      END IF;

      new.accepted_at := NOW();
      RETURN new;
    END IF;

    -- Case C2: Driver updating an already assigned ride
    IF old.driver_id = v_user_driver_id THEN
      -- Valid workflow: accepted -> driver_arriving -> in_progress -> completed (or cancelled)
      IF new.status IS DISTINCT FROM old.status THEN
        IF (old.status = 'accepted' AND new.status IN ('driver_arriving', 'cancelled')) THEN
          -- OK
        ELSIF (old.status = 'driver_arriving' AND new.status IN ('in_progress', 'cancelled')) THEN
          IF new.status = 'in_progress' THEN new.started_at := NOW(); END IF;
        ELSIF (old.status = 'in_progress' AND new.status IN ('completed', 'cancelled')) THEN
          IF new.status = 'completed' THEN new.completed_at := NOW(); END IF;
        ELSE
          RAISE EXCEPTION 'Illegal ride status transition from % to %.', old.status, new.status;
        END IF;

        IF new.status = 'cancelled' THEN
          new.cancelled_at := NOW();
          new.cancelled_by := 'driver';
        END IF;
      END IF;

      RETURN new;
    END IF;

    RAISE EXCEPTION 'Access denied: You are not assigned to this ride booking.';
  END IF;

  RAISE EXCEPTION 'Unauthorized operation: You do not have permission to modify this ride.';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ride_integrity ON public.rides;
CREATE TRIGGER trg_enforce_ride_integrity
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ride_integrity_and_transitions();

-- ====================================================================
-- 6. Row Level Security: RIDES Table
-- ====================================================================
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Riders and drivers can view relevant rides" ON public.rides;
DROP POLICY IF EXISTS "Riders can insert own rides" ON public.rides;
DROP POLICY IF EXISTS "Riders can insert their own rides" ON public.rides;
DROP POLICY IF EXISTS "Riders and assigned drivers can update rides" ON public.rides;
DROP POLICY IF EXISTS "Riders can cancel own rides" ON public.rides;
DROP POLICY IF EXISTS "Drivers can update assigned rides" ON public.rides;
DROP POLICY IF EXISTS "Admins have full access to rides" ON public.rides;

DROP POLICY IF EXISTS "Riders and drivers can view relevant rides" ON public.rides;
CREATE POLICY "Riders and drivers can view relevant rides" ON public.rides
  FOR SELECT TO authenticated
  USING (
    rider_id = public.current_profile_id()
    OR driver_id = public.current_driver_id()
    OR (status = 'requested' AND public.is_approved_driver())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Riders can insert own rides" ON public.rides;
CREATE POLICY "Riders can insert own rides" ON public.rides
  FOR INSERT TO authenticated
  WITH CHECK (
    rider_id = public.current_profile_id()
    AND status IN ('requested', 'accepted')
    AND payment_status = 'pending'
  );

DROP POLICY IF EXISTS "Participants can update rides" ON public.rides;
CREATE POLICY "Participants can update rides" ON public.rides
  FOR UPDATE TO authenticated
  USING (
    rider_id = public.current_profile_id()
    OR driver_id = public.current_driver_id()
    OR (status = 'requested' AND driver_id IS NULL AND public.is_approved_driver())
    OR public.is_admin()
  )
  WITH CHECK (
    rider_id = public.current_profile_id()
    OR driver_id = public.current_driver_id()
    OR (status = 'accepted' AND driver_id = public.current_driver_id())
    OR public.is_admin()
  );

-- ====================================================================
-- 7. Row Level Security: RIDE STOPS Table
-- ====================================================================
ALTER TABLE public.ride_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ride stops participant access" ON public.ride_stops;
DROP POLICY IF EXISTS "Users can view ride stops for accessible rides" ON public.ride_stops;
DROP POLICY IF EXISTS "Riders can insert ride stops" ON public.ride_stops;

DROP POLICY IF EXISTS "Users can view ride stops for accessible rides" ON public.ride_stops;
CREATE POLICY "Users can view ride stops for accessible rides" ON public.ride_stops
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = ride_stops.ride_id
      AND (
        r.rider_id = public.current_profile_id()
        OR r.driver_id = public.current_driver_id()
        OR (r.status = 'requested' AND public.is_approved_driver())
        OR public.is_admin()
      )
    )
  );

DROP POLICY IF EXISTS "Riders can insert ride stops" ON public.ride_stops;
CREATE POLICY "Riders can insert ride stops" ON public.ride_stops
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = ride_stops.ride_id
      AND r.rider_id = public.current_profile_id()
    )
  );

-- ====================================================================
-- 8. Row Level Security: DRIVER LOCATIONS Table (Priority 3)
-- ====================================================================
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct client access to driver locations" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can update own ride location" ON public.driver_locations;
DROP POLICY IF EXISTS "Riders and drivers can view active ride location" ON public.driver_locations;

-- SELECT is authorized for the active rider on the trip, assigned driver, or admin
DROP POLICY IF EXISTS "Riders and drivers can view active ride location" ON public.driver_locations;
CREATE POLICY "Riders and drivers can view active ride location" ON public.driver_locations
  FOR SELECT TO authenticated
  USING (
    driver_id = public.current_driver_id()
    OR EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = driver_locations.ride_id
      AND (
        r.rider_id = public.current_profile_id()
        OR public.is_admin()
      )
    )
  );

-- Direct client INSERT / UPDATE / DELETE is denied.
-- Telemetry updates MUST flow through backend /api/location/update to enforce GPS boundaries,
-- rate limits, India territorial checks, and verified assignment.
DROP POLICY IF EXISTS "No direct client modification of driver locations" ON public.driver_locations;
CREATE POLICY "No direct client modification of driver locations" ON public.driver_locations
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "No direct client update of driver locations" ON public.driver_locations;
CREATE POLICY "No direct client update of driver locations" ON public.driver_locations
  FOR UPDATE TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "No direct client delete of driver locations" ON public.driver_locations;
CREATE POLICY "No direct client delete of driver locations" ON public.driver_locations
  FOR DELETE TO anon, authenticated
  USING (false);

-- ====================================================================
-- 9. Row Level Security: PROCESSED PAYMENT WEBHOOKS (Priority 3 & 5)
-- ====================================================================
ALTER TABLE public.processed_payment_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to webhook log" ON public.processed_payment_webhooks;
DROP POLICY IF EXISTS "Deny all client access to webhook audit log" ON public.processed_payment_webhooks;

DROP POLICY IF EXISTS "Deny all client access to webhook audit log" ON public.processed_payment_webhooks;
CREATE POLICY "Deny all client access to webhook audit log" ON public.processed_payment_webhooks
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ====================================================================
-- 10. Row Level Security: PAYMENTS Table (Priority 5)
-- ====================================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view payments for own rides" ON public.payments;
DROP POLICY IF EXISTS "No direct client modification of payments" ON public.payments;

DROP POLICY IF EXISTS "Users can view payments for own rides" ON public.payments;
CREATE POLICY "Users can view payments for own rides" ON public.payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = payments.ride_id
      AND (
        r.rider_id = public.current_profile_id()
        OR r.driver_id = public.current_driver_id()
        OR public.is_admin()
      )
    )
  );

-- Direct client modification is denied. Payment order creation and verification
-- MUST be executed server-side via trusted backend endpoints with Razorpay HMAC verification.
DROP POLICY IF EXISTS "No direct client insert on payments" ON public.payments;
CREATE POLICY "No direct client insert on payments" ON public.payments
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "No direct client update on payments" ON public.payments;
CREATE POLICY "No direct client update on payments" ON public.payments
  FOR UPDATE TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ====================================================================
-- 11. Row Level Security: DRIVERS Table (Priority 2)
-- ====================================================================
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved drivers" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can insert own profile" ON public.drivers;
DROP POLICY IF EXISTS "Drivers insert own record" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can update own profile" ON public.drivers;
DROP POLICY IF EXISTS "Drivers self update and admin manage" ON public.drivers;
DROP POLICY IF EXISTS "Admins can manage drivers" ON public.drivers;

DROP POLICY IF EXISTS "Public can view approved drivers" ON public.drivers;
CREATE POLICY "Public can view approved drivers" ON public.drivers
  FOR SELECT TO authenticated, anon
  USING (
    approval_status = 'approved'
    OR profile_id = public.current_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Drivers can insert own profile" ON public.drivers;
CREATE POLICY "Drivers can insert own profile" ON public.drivers
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = public.current_profile_id()
    AND approval_status = 'pending'
  );

DROP POLICY IF EXISTS "Drivers can update own profile" ON public.drivers;
CREATE POLICY "Drivers can update own profile" ON public.drivers
  FOR UPDATE TO authenticated
  USING (
    profile_id = public.current_profile_id()
    OR public.is_admin()
  )
  WITH CHECK (
    profile_id = public.current_profile_id()
    OR public.is_admin()
  );

-- ====================================================================
-- 12. Row Level Security: REVIEWS Table (Priority 8)
-- ====================================================================
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Enforce exactly one passenger review per journey at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_ride
  ON public.reviews(ride_id);


DROP POLICY IF EXISTS "Public reviews read access" ON public.reviews;
DROP POLICY IF EXISTS "Riders insert own reviews" ON public.reviews;

DROP POLICY IF EXISTS "Public reviews read access" ON public.reviews;
CREATE POLICY "Public reviews read access" ON public.reviews
  FOR SELECT TO authenticated, anon
  USING (true);

-- Only riders of completed rides can insert a review with rating 1-5
DROP POLICY IF EXISTS "Riders insert own reviews for completed rides" ON public.reviews;
CREATE POLICY "Riders insert own reviews for completed rides" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    rider_id = public.current_profile_id()
    AND rating >= 1 AND rating <= 5
    AND EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = reviews.ride_id
      AND r.rider_id = public.current_profile_id()
      AND r.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Riders update own review" ON public.reviews;
CREATE POLICY "Riders update own review" ON public.reviews
  FOR UPDATE TO authenticated
  USING (rider_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (rider_id = public.current_profile_id() OR public.is_admin());


-- Keep each driver's displayed profile rating in sync with passenger reviews.
CREATE OR REPLACE FUNCTION public.refresh_driver_average_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_profile_id UUID;
  v_average NUMERIC(3,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_driver_id := OLD.driver_id;
  ELSE
    v_driver_id := NEW.driver_id;
  END IF;
  SELECT profile_id INTO v_profile_id FROM public.drivers WHERE id = v_driver_id;

  IF v_profile_id IS NOT NULL THEN
    SELECT ROUND(AVG(rating)::numeric, 2)
      INTO v_average
      FROM public.reviews
      WHERE driver_id = v_driver_id;

    UPDATE public.profiles
      SET rating = COALESCE(v_average, 0)
      WHERE id = v_profile_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_driver_average_rating ON public.reviews;
CREATE TRIGGER trg_refresh_driver_average_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_driver_average_rating();

-- ====================================================================
-- 13. Row Level Security: SUPPORT TICKETS & MESSAGES (Priority 8)
-- ====================================================================
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support ticket owner and admin access" ON public.support_tickets;
DROP POLICY IF EXISTS "Support message ticket participant access" ON public.support_messages;

DROP POLICY IF EXISTS "Support ticket select access" ON public.support_tickets;
CREATE POLICY "Support ticket select access" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    user_id = public.current_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Support ticket insert access" ON public.support_tickets;
CREATE POLICY "Support ticket insert access" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = public.current_profile_id()
  );

DROP POLICY IF EXISTS "Support ticket update access" ON public.support_tickets;
CREATE POLICY "Support ticket update access" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (
    user_id = public.current_profile_id()
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = public.current_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Support message select access" ON public.support_messages;
CREATE POLICY "Support message select access" ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
      AND (
        t.user_id = public.current_profile_id()
        OR public.is_admin()
      )
    )
  );

DROP POLICY IF EXISTS "Support message insert access" ON public.support_messages;
CREATE POLICY "Support message insert access" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = public.current_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
      AND (
        t.user_id = public.current_profile_id()
        OR public.is_admin()
      )
    )
  );

-- ====================================================================
-- 14. Row Level Security: EMERGENCY EVENTS Table
-- ====================================================================
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Emergency events participant access" ON public.emergency_events;

DROP POLICY IF EXISTS "Emergency events participant access" ON public.emergency_events;
CREATE POLICY "Emergency events participant access" ON public.emergency_events
  FOR SELECT TO authenticated
  USING (
    triggered_by = public.current_profile_id()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = emergency_events.ride_id
      AND (
        r.rider_id = public.current_profile_id()
        OR r.driver_id = public.current_driver_id()
      )
    )
  );

DROP POLICY IF EXISTS "Emergency events insert access" ON public.emergency_events;
CREATE POLICY "Emergency events insert access" ON public.emergency_events
  FOR INSERT TO authenticated
  WITH CHECK (
    triggered_by = public.current_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = emergency_events.ride_id
      AND (
        r.rider_id = public.current_profile_id()
        OR r.driver_id = public.current_driver_id()
      )
    )
  );

-- ====================================================================
-- 15. Enable Supabase Realtime Publications Safely
-- ====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;


-- ===== Source migration 04_persistent_notifications_and_integrity.sql =====
-- RideBlue migration 04: account-isolated, database-backed notifications and integrity guards.
-- Apply after migrations 01-03 in the Supabase SQL editor or migration runner.


-- Remove misleading default metrics for accounts with no completed activity.
ALTER TABLE public.profiles ALTER COLUMN rating DROP DEFAULT;
ALTER TABLE public.drivers ALTER COLUMN acceptance_rate DROP DEFAULT;
-- Intentionally omitted automatic rating/acceptance metric rewrites to preserve existing production data.
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ride_id uuid REFERENCES public.rides(id) ON DELETE CASCADE,
  target_role text NOT NULL DEFAULT 'all' CHECK (target_role IN ('rider','driver','admin','all')),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','alert')),
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON public.notifications(recipient_user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "No direct notification inserts" ON public.notifications;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (recipient_user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (recipient_user_id = auth.uid()) WITH CHECK (recipient_user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (recipient_user_id = auth.uid());
DROP POLICY IF EXISTS "No direct notification inserts" ON public.notifications;
CREATE POLICY "No direct notification inserts" ON public.notifications FOR INSERT TO authenticated WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.emit_ride_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rider_auth_id uuid;
  driver_auth_id uuid;
  driver_profile_id uuid;
  notification_title text;
  notification_message text;
  notification_type text := 'info';
  notification_link text;
BEGIN
  SELECT nullif(p.user_id, '')::uuid INTO rider_auth_id FROM public.profiles p WHERE p.id = NEW.rider_id;
  IF TG_OP = 'INSERT' THEN
    IF rider_auth_id IS NOT NULL THEN
      INSERT INTO public.notifications(recipient_user_id, ride_id, target_role, title, message, type, link)
      VALUES (rider_auth_id, NEW.id, 'rider', 'Ride request submitted', 'Your ride request was saved. It is not confirmed until a driver accepts it.', 'info', '/rider/tracking/' || NEW.id::text);
    END IF;
    INSERT INTO public.notifications(recipient_user_id, ride_id, target_role, title, message, type, link)
    SELECT nullif(p.user_id, '')::uuid, NEW.id, 'driver', 'Ride request available', 'A new ride request is available. Review the trip details before accepting.', 'info', '/driver/requests'
    FROM public.drivers d JOIN public.profiles p ON p.id = d.profile_id
    WHERE d.approval_status = 'approved' AND d.is_online = true AND nullif(p.user_id, '') IS NOT NULL;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' THEN
      notification_title := 'Driver accepted your ride'; notification_message := 'A driver has accepted your booking.'; notification_type := 'success'; notification_link := '/rider/tracking/' || NEW.id::text;
    ELSIF NEW.status = 'driver_arriving' THEN
      notification_title := 'Driver arriving'; notification_message := 'Your assigned driver is on the way to the pickup point.'; notification_link := '/rider/tracking/' || NEW.id::text;
    ELSIF NEW.status = 'in_progress' THEN
      notification_title := 'Trip started'; notification_message := 'Your trip has started.'; notification_type := 'success'; notification_link := '/rider/tracking/' || NEW.id::text;
    ELSIF NEW.status = 'completed' THEN
      notification_title := 'Trip completed'; notification_message := 'Your trip is marked complete. You can now submit a rating.'; notification_type := 'success'; notification_link := '/rider/history';
    ELSIF NEW.status = 'cancelled' THEN
      notification_title := 'Ride cancelled'; notification_message := 'Your booking has been cancelled.'; notification_type := 'warning'; notification_link := '/rider/history';
    ELSIF NEW.status::text = 'rejected' THEN
      notification_title := 'Ride request rejected'; notification_message := 'Your ride request was rejected.'; notification_type := 'warning'; notification_link := '/rider/history';
    END IF;
    IF notification_title IS NOT NULL AND rider_auth_id IS NOT NULL THEN
      INSERT INTO public.notifications(recipient_user_id, ride_id, target_role, title, message, type, link)
      VALUES (rider_auth_id, NEW.id, 'rider', notification_title, notification_message, notification_type, notification_link);
    END IF;
    IF NEW.driver_id IS NOT NULL AND NEW.driver_id IS DISTINCT FROM OLD.driver_id THEN
      SELECT d.profile_id INTO driver_profile_id FROM public.drivers d WHERE d.id = NEW.driver_id;
      SELECT nullif(p.user_id, '')::uuid INTO driver_auth_id FROM public.profiles p WHERE p.id = driver_profile_id;
      IF driver_auth_id IS NOT NULL THEN
        INSERT INTO public.notifications(recipient_user_id, ride_id, target_role, title, message, type, link)
        VALUES (driver_auth_id, NEW.id, 'driver', 'Ride assigned to you', 'You accepted a ride request. Review the trip details.', 'success', '/driver/active-trip');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_emit_ride_notifications ON public.rides;
CREATE TRIGGER trg_emit_ride_notifications AFTER INSERT OR UPDATE OF status, driver_id ON public.rides FOR EACH ROW EXECUTE FUNCTION public.emit_ride_notifications();

-- Scheduled time never implies driver acceptance. New requests must start in requested state.
CREATE OR REPLACE FUNCTION public.enforce_new_ride_request_state()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status <> 'requested' THEN
    RAISE EXCEPTION 'New bookings must start as requested and cannot be auto-confirmed.';
  END IF;
  IF NEW.passenger_count IS NULL OR NEW.passenger_count < 1 OR NEW.passenger_count > 8 THEN
    RAISE EXCEPTION 'Passenger count must be between 1 and 8.';
  END IF;
  IF NEW.pickup_lat NOT BETWEEN -90 AND 90 OR NEW.destination_lat NOT BETWEEN -90 AND 90 OR
     NEW.pickup_lng NOT BETWEEN -180 AND 180 OR NEW.destination_lng NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Ride coordinates are outside valid geographic bounds.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_new_ride_request_state ON public.rides;
CREATE TRIGGER trg_enforce_new_ride_request_state BEFORE INSERT ON public.rides FOR EACH ROW EXECUTE FUNCTION public.enforce_new_ride_request_state();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- Direct browser writes must not be able to fabricate driver GPS coordinates.
-- The trusted /api/location/update route uses the server-only service role and is allowed.
CREATE OR REPLACE FUNCTION public.reject_client_driver_location_edits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin()
     AND (NEW.current_lat IS DISTINCT FROM OLD.current_lat OR NEW.current_lng IS DISTINCT FROM OLD.current_lng) THEN
    RAISE EXCEPTION 'Driver coordinates must be published through the authenticated GPS endpoint.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_reject_client_driver_location_edits ON public.drivers;
CREATE TRIGGER trg_reject_client_driver_location_edits
BEFORE UPDATE OF current_lat, current_lng ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.reject_client_driver_location_edits();

-- Ratings must belong to the authenticated rider and the exact completed trip/assigned driver.
-- Identity columns cannot be changed after a review is created.
CREATE OR REPLACE FUNCTION public.enforce_review_trip_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  trip public.rides%ROWTYPE;
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5.';
  END IF;
  SELECT * INTO trip FROM public.rides WHERE id = NEW.ride_id;
  IF NOT FOUND OR trip.status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed rides may be rated.';
  END IF;
  IF NEW.rider_id IS DISTINCT FROM trip.rider_id OR NEW.driver_id IS DISTINCT FROM trip.driver_id THEN
    RAISE EXCEPTION 'Review rider and driver must match the completed ride.';
  END IF;
  IF auth.uid() IS NOT NULL AND NEW.rider_id IS DISTINCT FROM public.current_profile_id() THEN
    RAISE EXCEPTION 'Only the rider who completed the trip may submit or edit its rating.';
  END IF;
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL AND NOT public.is_admin()
     AND (NEW.ride_id IS DISTINCT FROM OLD.ride_id OR NEW.rider_id IS DISTINCT FROM OLD.rider_id OR NEW.driver_id IS DISTINCT FROM OLD.driver_id) THEN
    RAISE EXCEPTION 'Review ownership and trip assignment cannot be changed.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_review_trip_integrity ON public.reviews;
CREATE TRIGGER trg_enforce_review_trip_integrity
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.enforce_review_trip_integrity();

-- Approved pricing is configuration, not a frontend constant. Do not seed sample rates.
CREATE TABLE IF NOT EXISTS public.fare_rules (
  vehicle_category text PRIMARY KEY CHECK (vehicle_category IN ('economy','sedan','suv','xl','airport_transfer')),
  base_fare numeric(10,2) NOT NULL CHECK (base_fare >= 0),
  rate_per_km numeric(10,2) NOT NULL CHECK (rate_per_km >= 0),
  rate_per_minute numeric(10,2) NOT NULL CHECK (rate_per_minute >= 0),
  minimum_fare numeric(10,2) NOT NULL CHECK (minimum_fare >= 0),
  cancellation_fee numeric(10,2) NOT NULL CHECK (cancellation_fee >= 0),
  max_passengers integer NOT NULL CHECK (max_passengers BETWEEN 1 AND 8),
  included_passengers integer NOT NULL CHECK (included_passengers BETWEEN 1 AND max_passengers),
  additional_passenger_fee numeric(10,2) NOT NULL CHECK (additional_passenger_fee >= 0),
  tax_rate numeric(6,4) NOT NULL CHECK (tax_rate BETWEEN 0 AND 1),
  commission_rate numeric(6,4) NOT NULL CHECK (commission_rate BETWEEN 0 AND 1),
  active boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fare_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read active fare rules" ON public.fare_rules;
DROP POLICY IF EXISTS "Admins manage fare rules" ON public.fare_rules;
DROP POLICY IF EXISTS "Read active fare rules" ON public.fare_rules;
CREATE POLICY "Read active fare rules" ON public.fare_rules FOR SELECT TO authenticated USING (active = true OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage fare rules" ON public.fare_rules;
CREATE POLICY "Admins manage fare rules" ON public.fare_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Key/value settings remain empty until the operator approves actual business values.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  setting_key text PRIMARY KEY CHECK (length(setting_key) BETWEEN 1 AND 100),
  setting_value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings" ON public.platform_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Coupon records are visible only when active and valid; only admins may create or change them.
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read active valid promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins manage promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Read active valid promo codes" ON public.promo_codes;
CREATE POLICY "Read active valid promo codes" ON public.promo_codes FOR SELECT TO authenticated USING ((is_active = true AND valid_until > now()) OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins manage promo codes" ON public.promo_codes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ===== Source migration 05_trusted_fares_and_booking_creation.sql =====
-- RideBlue Phase 1: trusted pricing snapshots and atomic booking creation.
-- Review and apply only after backing up the target database. No pricing values are seeded.
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS extra_passenger_charge numeric(10,2) CHECK (extra_passenger_charge IS NULL OR extra_passenger_charge >= 0);
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS fare_breakdown jsonb;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS pricing_version integer;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS idempotency_fingerprint text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rides_idempotency_key_unique ON public.rides(idempotency_key) WHERE idempotency_key IS NOT NULL;


CREATE OR REPLACE FUNCTION public.bump_fare_rule_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.version := OLD.version + 1;
  ELSE
    NEW.version := greatest(coalesce(NEW.version, 1), 1);
  END IF;
  IF auth.uid() IS NOT NULL THEN NEW.updated_by := auth.uid(); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_bump_fare_rule_version ON public.fare_rules;
CREATE TRIGGER trg_bump_fare_rule_version BEFORE INSERT OR UPDATE ON public.fare_rules FOR EACH ROW EXECUTE FUNCTION public.bump_fare_rule_version();

CREATE OR REPLACE FUNCTION public.calculate_fare_quote(
  p_vehicle_category text,
  p_passenger_count integer,
  p_distance_km numeric,
  p_duration_minutes integer,
  p_expected_version integer DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rule public.fare_rules%ROWTYPE;
  v_base numeric(10,2);
  v_distance numeric(10,2);
  v_time numeric(10,2);
  v_extra numeric(10,2);
  v_subtotal numeric(10,2);
  v_tax numeric(10,2);
  v_total numeric(10,2);
BEGIN
  IF p_vehicle_category IS NULL OR p_passenger_count IS NULL OR p_distance_km IS NULL OR p_duration_minutes IS NULL OR p_distance_km <= 0 OR p_duration_minutes <= 0 THEN
    RAISE EXCEPTION 'A valid vehicle category, passenger count, and server-validated route are required.';
  END IF;
  SELECT * INTO v_rule FROM public.fare_rules WHERE vehicle_category = p_vehicle_category AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active approved fare rule exists for this vehicle category.'; END IF;
  IF p_expected_version IS NOT NULL AND v_rule.version <> p_expected_version THEN RAISE EXCEPTION 'Fare rule version changed. Request a new quote.'; END IF;
  IF p_passenger_count < 1 OR p_passenger_count > 8 OR p_passenger_count > v_rule.max_passengers THEN RAISE EXCEPTION 'Passenger count exceeds this vehicle capacity.'; END IF;

  v_base := round(v_rule.base_fare, 2);
  v_distance := round(p_distance_km * v_rule.rate_per_km, 2);
  v_time := round(p_duration_minutes * v_rule.rate_per_minute, 2);
  v_extra := round(greatest(0, p_passenger_count - v_rule.included_passengers) * v_rule.additional_passenger_fee, 2);
  v_subtotal := round(greatest(v_rule.minimum_fare, v_base + v_distance + v_time + v_extra), 2);
  v_tax := round(v_subtotal * v_rule.tax_rate, 2);
  v_total := round(v_subtotal + v_tax, 2);

  RETURN jsonb_build_object(
    'pricingVersion', v_rule.version, 'maxPassengers', v_rule.max_passengers, 'includedPassengers', v_rule.included_passengers,
    'baseRate', v_rule.base_fare, 'ratePerKm', v_rule.rate_per_km, 'ratePerMinute', v_rule.rate_per_minute,
    'minimumFare', v_rule.minimum_fare, 'extraPassengerRate', v_rule.additional_passenger_fee, 'cancellationFee', v_rule.cancellation_fee,
    'taxRate', v_rule.tax_rate, 'commissionRate', v_rule.commission_rate,
    'baseFare', v_base, 'distanceCharge', v_distance, 'timeCharge', v_time,
    'extraPassengerCharge', v_extra, 'subtotal', v_subtotal, 'taxes', v_tax, 'total', v_total, 'currency', 'INR'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.calculate_fare_quote(text,integer,numeric,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_fare_quote(text,integer,numeric,integer,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.create_ride_with_fare_quote(
  p_auth_user_id uuid,
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_pickup jsonb,
  p_destination jsonb,
  p_stops jsonb,
  p_vehicle_category text,
  p_passenger_count integer,
  p_distance_km numeric,
  p_duration_minutes integer,
  p_pricing_version integer,
  p_payment_method text,
  p_scheduled_for timestamptz DEFAULT NULL
)
RETURNS SETOF public.rides
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_rule public.fare_rules%ROWTYPE;
  v_ride public.rides%ROWTYPE;
  v_base numeric(10,2);
  v_distance numeric(10,2);
  v_time numeric(10,2);
  v_extra numeric(10,2);
  v_subtotal numeric(10,2);
  v_tax numeric(10,2);
  v_total numeric(10,2);
  v_fare jsonb;
  v_code text;
  v_stop jsonb;
  v_index integer := 0;
BEGIN
  IF p_auth_user_id IS NULL OR p_idempotency_key IS NULL OR p_request_fingerprint IS NULL THEN RAISE EXCEPTION 'Authenticated user, request ID, and request fingerprint are required.'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_auth_user_id::text FOR SHARE;
  IF NOT FOUND OR v_profile.role <> 'rider' THEN RAISE EXCEPTION 'Only a verified rider can create a booking.'; END IF;

  SELECT * INTO v_ride FROM public.rides WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_ride.rider_id <> v_profile.id OR v_ride.idempotency_fingerprint IS DISTINCT FROM p_request_fingerprint THEN RAISE EXCEPTION 'Request ID has already been used for a different booking request.'; END IF;
    RETURN NEXT v_ride; RETURN;
  END IF;

  IF jsonb_typeof(p_pickup) <> 'object' OR jsonb_typeof(p_destination) <> 'object' OR jsonb_typeof(coalesce(p_stops, '[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'Invalid route input.'; END IF;
  IF jsonb_array_length(coalesce(p_stops, '[]'::jsonb)) > 2 THEN RAISE EXCEPTION 'A maximum of two intermediate stops is allowed.'; END IF;
  IF p_passenger_count IS NULL OR p_passenger_count < 1 OR p_passenger_count > 8 OR p_distance_km IS NULL OR p_distance_km <= 0 OR p_duration_minutes IS NULL OR p_duration_minutes <= 0 OR p_payment_method IS NULL OR p_payment_method NOT IN ('cash','razorpay','upi') THEN RAISE EXCEPTION 'Invalid booking values.'; END IF;
  IF nullif(trim(p_pickup->>'address'), '') IS NULL OR nullif(trim(p_destination->>'address'), '') IS NULL OR
     (p_pickup->>'lat')::numeric NOT BETWEEN 6 AND 37.5 OR (p_destination->>'lat')::numeric NOT BETWEEN 6 AND 37.5 OR
     (p_pickup->>'lng')::numeric NOT BETWEEN 68 AND 97.5 OR (p_destination->>'lng')::numeric NOT BETWEEN 68 AND 97.5 THEN RAISE EXCEPTION 'Pickup and destination must be valid locations in India.'; END IF;

  SELECT * INTO v_rule FROM public.fare_rules WHERE vehicle_category = p_vehicle_category AND active = true FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active fare rule exists for this vehicle category.'; END IF;
  IF v_rule.version <> p_pricing_version THEN RAISE EXCEPTION 'Fare rule version changed. Request a new quote.'; END IF;
  IF p_passenger_count > v_rule.max_passengers THEN RAISE EXCEPTION 'Passenger count exceeds this vehicle capacity.'; END IF;

  v_fare := public.calculate_fare_quote(p_vehicle_category, p_passenger_count, p_distance_km, p_duration_minutes, p_pricing_version);
  v_base := (v_fare->>'baseFare')::numeric;
  v_distance := (v_fare->>'distanceCharge')::numeric;
  v_time := (v_fare->>'timeCharge')::numeric;
  v_extra := (v_fare->>'extraPassengerCharge')::numeric;
  v_subtotal := (v_fare->>'subtotal')::numeric;
  v_tax := (v_fare->>'taxes')::numeric;
  v_total := (v_fare->>'total')::numeric;
  v_code := 'RB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.rides (
    booking_code, rider_id, vehicle_category, pickup_address, pickup_lat, pickup_lng,
    destination_address, destination_lat, destination_lng, passenger_count, scheduled_for,
    status, distance_km, estimated_duration_min, base_fare, distance_fare, time_fare,
    extra_passenger_charge, toll_charges, taxes, discount, total_fare, payment_method,
    payment_status, pricing_version, fare_breakdown, idempotency_key, idempotency_fingerprint
  ) VALUES (
    v_code, v_profile.id, p_vehicle_category::public.vehicle_category,
    left(trim(p_pickup->>'address'), 500), (p_pickup->>'lat')::numeric, (p_pickup->>'lng')::numeric,
    left(trim(p_destination->>'address'), 500), (p_destination->>'lat')::numeric, (p_destination->>'lng')::numeric,
    p_passenger_count, p_scheduled_for, 'requested'::public.ride_status,
    p_distance_km, p_duration_minutes, v_base, v_distance, v_time, v_extra, NULL, v_tax, 0, v_total,
    p_payment_method::public.payment_method, 'pending'::public.payment_status, v_rule.version,
    v_fare || jsonb_build_object('distanceKm',p_distance_km,'durationMinutes',p_duration_minutes,'passengerCount',p_passenger_count,'tollCharges',NULL,'tollPolicy','not_configured'), p_idempotency_key, p_request_fingerprint
  ) ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING * INTO v_ride;

  IF NOT FOUND THEN
    SELECT * INTO v_ride FROM public.rides WHERE idempotency_key = p_idempotency_key;
    IF NOT FOUND OR v_ride.rider_id <> v_profile.id OR v_ride.idempotency_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
      RAISE EXCEPTION 'Request ID has already been used for a different booking request.';
    END IF;
    RETURN NEXT v_ride; RETURN;
  END IF;

  FOR v_stop IN SELECT value FROM jsonb_array_elements(coalesce(p_stops, '[]'::jsonb)) LOOP
    v_index := v_index + 1;
    IF nullif(trim(v_stop->>'address'), '') IS NULL OR (v_stop->>'lat')::numeric NOT BETWEEN 6 AND 37.5 OR (v_stop->>'lng')::numeric NOT BETWEEN 68 AND 97.5 THEN RAISE EXCEPTION 'Invalid intermediate stop.'; END IF;
    INSERT INTO public.ride_stops(ride_id, stop_order, address, lat, lng)
    VALUES (v_ride.id, v_index, left(trim(v_stop->>'address'), 500), (v_stop->>'lat')::numeric, (v_stop->>'lng')::numeric);
  END LOOP;
  RETURN NEXT v_ride;
END;
$$;
REVOKE ALL ON FUNCTION public.create_ride_with_fare_quote(uuid,uuid,text,jsonb,jsonb,jsonb,text,integer,numeric,integer,integer,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_ride_with_fare_quote(uuid,uuid,text,jsonb,jsonb,jsonb,text,integer,numeric,integer,integer,text,timestamptz) TO service_role;


-- Clients must not insert rides directly with browser-supplied fares. All new rides
-- go through the trusted API and the service-role-only atomic function above.
DROP POLICY IF EXISTS "Riders can insert own rides" ON public.rides;
DROP POLICY IF EXISTS "Riders can insert their own rides" ON public.rides;
REVOKE INSERT ON public.rides FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_client_ride_pricing_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.rider_id IS DISTINCT FROM OLD.rider_id OR
     NEW.vehicle_category IS DISTINCT FROM OLD.vehicle_category OR
     NEW.pickup_address IS DISTINCT FROM OLD.pickup_address OR NEW.pickup_lat IS DISTINCT FROM OLD.pickup_lat OR NEW.pickup_lng IS DISTINCT FROM OLD.pickup_lng OR
     NEW.destination_address IS DISTINCT FROM OLD.destination_address OR NEW.destination_lat IS DISTINCT FROM OLD.destination_lat OR NEW.destination_lng IS DISTINCT FROM OLD.destination_lng OR
     NEW.passenger_count IS DISTINCT FROM OLD.passenger_count OR NEW.scheduled_for IS DISTINCT FROM OLD.scheduled_for OR
     NEW.distance_km IS DISTINCT FROM OLD.distance_km OR NEW.estimated_duration_min IS DISTINCT FROM OLD.estimated_duration_min OR
     NEW.base_fare IS DISTINCT FROM OLD.base_fare OR NEW.distance_fare IS DISTINCT FROM OLD.distance_fare OR
     NEW.time_fare IS DISTINCT FROM OLD.time_fare OR NEW.extra_passenger_charge IS DISTINCT FROM OLD.extra_passenger_charge OR
     NEW.toll_charges IS DISTINCT FROM OLD.toll_charges OR NEW.taxes IS DISTINCT FROM OLD.taxes OR
     NEW.discount IS DISTINCT FROM OLD.discount OR NEW.total_fare IS DISTINCT FROM OLD.total_fare OR
     NEW.fare_breakdown IS DISTINCT FROM OLD.fare_breakdown OR NEW.pricing_version IS DISTINCT FROM OLD.pricing_version OR
     NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key OR NEW.idempotency_fingerprint IS DISTINCT FROM OLD.idempotency_fingerprint THEN
    RAISE EXCEPTION 'Security violation: route inputs and fare snapshots are immutable after booking creation.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_prevent_client_ride_pricing_mutation ON public.rides;
CREATE TRIGGER trg_prevent_client_ride_pricing_mutation BEFORE UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.prevent_client_ride_pricing_mutation();


-- ===== Source migration 06_airport_levies_tolls_assignment.sql =====
-- RideBlue Phase 2: airport levy policy, actual-cost toll adjustments, and atomic driver acceptance.
-- Review against the target schema and apply manually after a database backup. No prices or records are seeded.

ALTER TABLE public.fare_rules
  ADD COLUMN IF NOT EXISTS effective_from timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS effective_until timestamptz;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fare_rules_effective_window_check' AND conrelid = 'public.fare_rules'::regclass) THEN
    ALTER TABLE public.fare_rules ADD CONSTRAINT fare_rules_effective_window_check CHECK (effective_until IS NULL OR effective_until > effective_from);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_fare_rules_active_effective ON public.fare_rules(active, effective_from, effective_until);

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS airport_levy_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (airport_levy_amount >= 0),
  ADD COLUMN IF NOT EXISTS airport_levy_rule_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.airport_levy_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_code text NOT NULL CHECK (length(trim(airport_code)) BETWEEN 2 AND 20),
  airport_name text NOT NULL CHECK (length(trim(airport_name)) BETWEEN 2 AND 160),
  match_terms text[] NOT NULL CHECK (cardinality(match_terms) > 0),
  journey_type text NOT NULL CHECK (journey_type IN ('pickup','dropoff','either')),
  vehicle_category text CHECK (vehicle_category IS NULL OR vehicle_category IN ('economy','sedan','suv','xl','airport_transfer')),
  levy_amount numeric(10,2) NOT NULL CHECK (levy_amount >= 0),
  taxable boolean NOT NULL,
  active boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_until IS NULL OR effective_until > effective_from)
);
CREATE INDEX IF NOT EXISTS idx_airport_levy_active_effective ON public.airport_levy_rules(active, effective_from, effective_until);
ALTER TABLE public.airport_levy_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read applicable airport levy rules" ON public.airport_levy_rules;
DROP POLICY IF EXISTS "Admins manage airport levy rules" ON public.airport_levy_rules;
DROP POLICY IF EXISTS "Read applicable airport levy rules" ON public.airport_levy_rules;
CREATE POLICY "Read applicable airport levy rules" ON public.airport_levy_rules FOR SELECT TO authenticated USING (active OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage airport levy rules" ON public.airport_levy_rules;
CREATE POLICY "Admins manage airport levy rules" ON public.airport_levy_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.bump_airport_levy_rule_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN NEW.version := OLD.version + 1; ELSE NEW.version := greatest(coalesce(NEW.version, 1), 1); END IF;
  IF auth.uid() IS NOT NULL THEN NEW.updated_by := auth.uid(); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_bump_airport_levy_rule_version ON public.airport_levy_rules;
CREATE TRIGGER trg_bump_airport_levy_rule_version BEFORE INSERT OR UPDATE ON public.airport_levy_rules FOR EACH ROW EXECUTE FUNCTION public.bump_airport_levy_rule_version();

-- A toll is an additional, separately auditable actual-cost adjustment. New rows are never auto-verified or auto-settled.
CREATE TABLE IF NOT EXISTS public.ride_toll_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE RESTRICT,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  details text NOT NULL CHECK (length(trim(details)) BETWEEN 3 AND 1000),
  recording_source text NOT NULL CHECK (recording_source IN ('driver_report','verified_receipt','trusted_provider','admin_entry')),
  source_reference text,
  idempotency_key uuid NOT NULL,
  recorded_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  verification_status text NOT NULL DEFAULT 'pending_verification' CHECK (verification_status IN ('pending_verification','verified','settled','rejected')),
  verified_by_user_id uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ride_id, idempotency_key),
  CHECK ((verification_status IN ('verified','settled')) = (verified_at IS NOT NULL)),
  CHECK ((verification_status = 'settled') = (settled_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_ride_toll_adjustments_ride_created ON public.ride_toll_adjustments(ride_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ride_toll_adjustments_source_reference_unique ON public.ride_toll_adjustments(ride_id, source_reference) WHERE source_reference IS NOT NULL;
ALTER TABLE public.ride_toll_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants and admins read toll adjustments" ON public.ride_toll_adjustments;
DROP POLICY IF EXISTS "No direct toll adjustment writes" ON public.ride_toll_adjustments;
DROP POLICY IF EXISTS "Participants and admins read toll adjustments" ON public.ride_toll_adjustments;
CREATE POLICY "Participants and admins read toll adjustments" ON public.ride_toll_adjustments FOR SELECT TO authenticated USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.rides r
    JOIN public.profiles p ON p.id = r.rider_id
    LEFT JOIN public.drivers d ON d.id = r.driver_id
    LEFT JOIN public.profiles dp ON dp.id = d.profile_id
    WHERE r.id = ride_toll_adjustments.ride_id AND (p.user_id = auth.uid()::text OR dp.user_id = auth.uid()::text)
  )
);
DROP POLICY IF EXISTS "No direct toll adjustment writes" ON public.ride_toll_adjustments;
CREATE POLICY "No direct toll adjustment writes" ON public.ride_toll_adjustments FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.record_ride_toll_adjustment(
  p_ride_id uuid, p_amount numeric, p_details text, p_recording_source text,
  p_source_reference text, p_idempotency_key uuid
) RETURNS public.ride_toll_adjustments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_profile public.profiles%ROWTYPE; v_driver public.drivers%ROWTYPE;
  v_ride public.rides%ROWTYPE; v_existing public.ride_toll_adjustments%ROWTYPE; v_result public.ride_toll_adjustments%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 OR p_idempotency_key IS NULL OR length(trim(coalesce(p_details,''))) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'Invalid toll adjustment details.'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_user::text;
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ride not found.'; END IF;
  SELECT * INTO v_existing FROM public.ride_toll_adjustments WHERE ride_id = p_ride_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.recorded_by_user_id <> v_user OR v_existing.amount <> round(p_amount,2) OR v_existing.details <> trim(p_details) OR v_existing.recording_source <> p_recording_source OR v_existing.source_reference IS DISTINCT FROM nullif(trim(p_source_reference),'') THEN RAISE EXCEPTION 'Toll idempotency key reused with different details.'; END IF;
    RETURN v_existing;
  END IF;
  IF v_profile.role = 'admin' THEN
    IF p_recording_source <> 'admin_entry' THEN RAISE EXCEPTION 'Admin toll entries must identify their recording source.'; END IF;
  ELSIF v_profile.role = 'driver' THEN
    SELECT * INTO v_driver FROM public.drivers WHERE profile_id = v_profile.id;
    IF NOT FOUND OR v_ride.driver_id IS DISTINCT FROM v_driver.id OR v_ride.status NOT IN ('accepted','driver_arriving','in_progress','completed') THEN RAISE EXCEPTION 'Only the assigned driver may record a toll for this ride.'; END IF;
    IF p_recording_source NOT IN ('driver_report','verified_receipt','trusted_provider') THEN RAISE EXCEPTION 'Invalid driver toll source.'; END IF;
  ELSE
    RAISE EXCEPTION 'Only the assigned driver or an administrator may record a toll.';
  END IF;
  INSERT INTO public.ride_toll_adjustments(ride_id,amount,details,recording_source,source_reference,idempotency_key,recorded_by_user_id,verification_status)
  VALUES(p_ride_id,round(p_amount,2),trim(p_details),p_recording_source,nullif(trim(p_source_reference),''),p_idempotency_key,v_user,'pending_verification')
  RETURNING * INTO v_result;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.record_ride_toll_adjustment(uuid,numeric,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_ride_toll_adjustment(uuid,numeric,text,text,text,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.review_ride_toll_adjustment(p_adjustment_id uuid, p_decision text)
RETURNS public.ride_toll_adjustments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result public.ride_toll_adjustments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator privileges required.'; END IF;
  IF p_decision NOT IN ('verified','rejected') THEN RAISE EXCEPTION 'Decision must be verified or rejected.'; END IF;
  UPDATE public.ride_toll_adjustments SET verification_status = p_decision,
    verified_by_user_id = CASE WHEN p_decision = 'verified' THEN auth.uid() ELSE NULL END,
    verified_at = CASE WHEN p_decision = 'verified' THEN now() ELSE NULL END, updated_at = now()
  WHERE id = p_adjustment_id AND verification_status = 'pending_verification' RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Toll adjustment is missing or no longer pending verification.'; END IF;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.review_ride_toll_adjustment(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_ride_toll_adjustment(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.settle_ride_toll_adjustment(p_adjustment_id uuid)
RETURNS public.ride_toll_adjustments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result public.ride_toll_adjustments%ROWTYPE;
BEGIN
  -- This function is reserved for a trusted payment reconciliation process. Admin verification alone is not proof of collection.
  IF coalesce(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'Only verified payment reconciliation can settle tolls.'; END IF;
  UPDATE public.ride_toll_adjustments SET verification_status='settled', settled_at=now(), updated_at=now()
  WHERE id=p_adjustment_id AND verification_status='verified' RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only a verified toll adjustment can be settled.'; END IF;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.settle_ride_toll_adjustment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_ride_toll_adjustment(uuid) TO service_role;

-- Resolve explicit airport levy rules from normalized address terms. No matching rule means no charge is invented.
CREATE OR REPLACE FUNCTION public.calculate_fare_quote_v2(
  p_vehicle_category text, p_passenger_count integer, p_distance_km numeric, p_duration_minutes integer,
  p_expected_version integer, p_pickup_address text, p_destination_address text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fare jsonb; v_pricing_rule public.fare_rules%ROWTYPE; v_levy numeric(10,2) := 0; v_taxable_levy numeric(10,2) := 0;
  v_rules jsonb := '[]'::jsonb; v_tax numeric(10,2); v_total numeric(10,2); v_tax_rate numeric; v_needs_verification boolean := false;
BEGIN
  IF nullif(trim(p_pickup_address),'') IS NULL OR nullif(trim(p_destination_address),'') IS NULL THEN RAISE EXCEPTION 'Pickup and destination addresses are required for airport levy evaluation.'; END IF;
  SELECT * INTO v_pricing_rule FROM public.fare_rules WHERE vehicle_category = p_vehicle_category AND active = true;
  IF NOT FOUND OR v_pricing_rule.effective_from > now() OR (v_pricing_rule.effective_until IS NOT NULL AND v_pricing_rule.effective_until <= now()) THEN RAISE EXCEPTION 'No active fare rule is effective for this vehicle category at this time.'; END IF;
  IF p_expected_version IS NOT NULL AND v_pricing_rule.version <> p_expected_version THEN RAISE EXCEPTION 'Fare rule version changed. Request a new quote.'; END IF;
  v_fare := public.calculate_fare_quote(p_vehicle_category,p_passenger_count,p_distance_km,p_duration_minutes,p_expected_version);
  WITH endpoints AS (
    SELECT 'pickup'::text AS endpoint, lower(p_pickup_address) AS address
    UNION ALL SELECT 'dropoff', lower(p_destination_address)
  ), matched AS (
    SELECT e.endpoint, r.id, r.airport_code, r.airport_name, r.levy_amount, r.taxable, r.version,
      row_number() OVER (PARTITION BY e.endpoint ORDER BY (r.vehicle_category IS NOT NULL) DESC,
        (SELECT max(length(trim(term))) FROM unnest(r.match_terms) term WHERE length(trim(term)) >= 3 AND e.address LIKE '%' || lower(trim(term)) || '%') DESC,
        r.effective_from DESC, r.version DESC) AS rule_rank
    FROM endpoints e JOIN public.airport_levy_rules r ON r.active = true
      AND r.effective_from <= now() AND (r.effective_until IS NULL OR r.effective_until > now())
      AND (r.vehicle_category IS NULL OR r.vehicle_category = p_vehicle_category)
      AND (r.journey_type = 'either' OR r.journey_type = e.endpoint)
      AND EXISTS (SELECT 1 FROM unnest(r.match_terms) term WHERE length(trim(term)) >= 3 AND e.address LIKE '%' || lower(trim(term)) || '%')
  )
  SELECT coalesce(sum(levy_amount),0), coalesce(sum(CASE WHEN taxable THEN levy_amount ELSE 0 END),0),
    coalesce(jsonb_agg(jsonb_build_object('ruleId',id,'airportCode',airport_code,'airportName',airport_name,'endpoint',endpoint,'amount',levy_amount,'taxable',taxable,'version',version) ORDER BY endpoint, airport_code),'[]'::jsonb)
  INTO v_levy, v_taxable_levy, v_rules FROM matched WHERE rule_rank = 1;
  v_tax_rate := (v_fare->>'taxRate')::numeric;
  v_needs_verification := v_levy = 0 AND (p_vehicle_category = 'airport_transfer' OR lower(p_pickup_address) LIKE '%airport%' OR lower(p_destination_address) LIKE '%airport%');
  v_tax := round(((v_fare->>'subtotal')::numeric + v_taxable_levy) * v_tax_rate, 2);
  v_total := round((v_fare->>'subtotal')::numeric + v_levy + v_tax, 2);
  RETURN v_fare || jsonb_build_object('taxes',v_tax,'airportLevyAmount',v_levy,'airportLevyRules',v_rules,
    'airportLevyVerificationRequired', v_needs_verification, 'total',v_total,
    'tollCharges',null,'tollPolicy','actual cost separately recorded and verified; excluded from fare quote');
END; $$;
REVOKE ALL ON FUNCTION public.calculate_fare_quote_v2(text,integer,numeric,integer,integer,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_fare_quote_v2(text,integer,numeric,integer,integer,text,text) TO service_role;

-- Atomic driver claim: identity is derived from auth.uid(), never from a client-supplied driver ID.
CREATE OR REPLACE FUNCTION public.accept_ride_request(p_ride_id uuid)
RETURNS public.rides LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_driver public.drivers%ROWTYPE; v_ride public.rides%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = auth.uid()::text AND role = 'driver';
  IF NOT FOUND THEN RAISE EXCEPTION 'Driver account required.'; END IF;
  SELECT * INTO v_driver FROM public.drivers WHERE profile_id = v_profile.id FOR UPDATE;
  IF NOT FOUND OR v_driver.approval_status <> 'approved' OR v_driver.is_online IS DISTINCT FROM true THEN RAISE EXCEPTION 'Only approved, online drivers may accept new requests.'; END IF;
  PERFORM set_config('rideblue.accepting_ride', 'true', true);
  UPDATE public.rides SET driver_id = v_driver.id, status = 'accepted', accepted_at = now()
    WHERE id = p_ride_id AND status = 'requested' AND driver_id IS NULL AND vehicle_category = v_driver.vehicle_category
    RETURNING * INTO v_ride;
  IF NOT FOUND THEN RAISE EXCEPTION 'This ride has already been accepted, is unavailable, or is no longer requested.'; END IF;
  RETURN v_ride;
END; $$;
REVOKE ALL ON FUNCTION public.accept_ride_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_ride_request(uuid) TO authenticated;

-- Keep direct client assignment/status advancement disabled; acceptance uses the RPC above.
REVOKE UPDATE ON public.rides FROM anon;

-- Enable realtime for operational records when the Supabase publication exists.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_toll_adjustments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;


-- Versioned booking operation recomputes airport levy rules inside the same transaction.
CREATE OR REPLACE FUNCTION public.create_ride_with_fare_quote_v2(
  p_auth_user_id uuid,
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_pickup jsonb,
  p_destination jsonb,
  p_stops jsonb,
  p_vehicle_category text,
  p_passenger_count integer,
  p_distance_km numeric,
  p_duration_minutes integer,
  p_pricing_version integer,
  p_payment_method text,
  p_expected_airport_levy numeric,
  p_expected_airport_levy_rules jsonb,
  p_scheduled_for timestamptz DEFAULT NULL
)
RETURNS SETOF public.rides
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_rule public.fare_rules%ROWTYPE;
  v_ride public.rides%ROWTYPE;
  v_base numeric(10,2);
  v_distance numeric(10,2);
  v_time numeric(10,2);
  v_extra numeric(10,2);
  v_subtotal numeric(10,2);
  v_tax numeric(10,2);
  v_total numeric(10,2);
  v_fare jsonb;
  v_code text;
  v_stop jsonb;
  v_index integer := 0;
BEGIN
  IF p_auth_user_id IS NULL OR p_idempotency_key IS NULL OR p_request_fingerprint IS NULL THEN RAISE EXCEPTION 'Authenticated user, request ID, and request fingerprint are required.'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_auth_user_id::text FOR SHARE;
  IF NOT FOUND OR v_profile.role <> 'rider' THEN RAISE EXCEPTION 'Only a verified rider can create a booking.'; END IF;

  SELECT * INTO v_ride FROM public.rides WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_ride.rider_id <> v_profile.id OR v_ride.idempotency_fingerprint IS DISTINCT FROM p_request_fingerprint THEN RAISE EXCEPTION 'Request ID has already been used for a different booking request.'; END IF;
    RETURN NEXT v_ride; RETURN;
  END IF;

  IF jsonb_typeof(p_pickup) <> 'object' OR jsonb_typeof(p_destination) <> 'object' OR jsonb_typeof(coalesce(p_stops, '[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'Invalid route input.'; END IF;
  IF jsonb_array_length(coalesce(p_stops, '[]'::jsonb)) > 2 THEN RAISE EXCEPTION 'A maximum of two intermediate stops is allowed.'; END IF;
  IF p_passenger_count IS NULL OR p_passenger_count < 1 OR p_passenger_count > 8 OR p_distance_km IS NULL OR p_distance_km <= 0 OR p_duration_minutes IS NULL OR p_duration_minutes <= 0 OR p_payment_method IS NULL OR p_payment_method NOT IN ('cash','razorpay','upi') THEN RAISE EXCEPTION 'Invalid booking values.'; END IF;
  IF nullif(trim(p_pickup->>'address'), '') IS NULL OR nullif(trim(p_destination->>'address'), '') IS NULL OR
     (p_pickup->>'lat')::numeric NOT BETWEEN 6 AND 37.5 OR (p_destination->>'lat')::numeric NOT BETWEEN 6 AND 37.5 OR
     (p_pickup->>'lng')::numeric NOT BETWEEN 68 AND 97.5 OR (p_destination->>'lng')::numeric NOT BETWEEN 68 AND 97.5 THEN RAISE EXCEPTION 'Pickup and destination must be valid locations in India.'; END IF;

  SELECT * INTO v_rule FROM public.fare_rules WHERE vehicle_category = p_vehicle_category AND active = true FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active fare rule exists for this vehicle category.'; END IF;
  IF v_rule.version <> p_pricing_version THEN RAISE EXCEPTION 'Fare rule version changed. Request a new quote.'; END IF;
  IF p_passenger_count > v_rule.max_passengers THEN RAISE EXCEPTION 'Passenger count exceeds this vehicle capacity.'; END IF;

  v_fare := public.calculate_fare_quote_v2(p_vehicle_category, p_passenger_count, p_distance_km, p_duration_minutes, p_pricing_version, p_pickup->>'address', p_destination->>'address');
  IF round((v_fare->>'airportLevyAmount')::numeric,2) IS DISTINCT FROM round(coalesce(p_expected_airport_levy,0),2) OR (v_fare->'airportLevyRules') IS DISTINCT FROM coalesce(p_expected_airport_levy_rules,'[]'::jsonb) THEN RAISE EXCEPTION 'Airport levy rules changed. Request a fresh quote.'; END IF;
  v_base := (v_fare->>'baseFare')::numeric;
  v_distance := (v_fare->>'distanceCharge')::numeric;
  v_time := (v_fare->>'timeCharge')::numeric;
  v_extra := (v_fare->>'extraPassengerCharge')::numeric;
  v_subtotal := (v_fare->>'subtotal')::numeric;
  v_tax := (v_fare->>'taxes')::numeric;
  v_total := (v_fare->>'total')::numeric;
  v_code := 'RB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.rides (
    booking_code, rider_id, vehicle_category, pickup_address, pickup_lat, pickup_lng,
    destination_address, destination_lat, destination_lng, passenger_count, scheduled_for,
    status, distance_km, estimated_duration_min, base_fare, distance_fare, time_fare,
    extra_passenger_charge, toll_charges, taxes, discount, total_fare, airport_levy_amount, airport_levy_rule_snapshot, payment_method,
    payment_status, pricing_version, fare_breakdown, idempotency_key, idempotency_fingerprint
  ) VALUES (
    v_code, v_profile.id, p_vehicle_category::public.vehicle_category,
    left(trim(p_pickup->>'address'), 500), (p_pickup->>'lat')::numeric, (p_pickup->>'lng')::numeric,
    left(trim(p_destination->>'address'), 500), (p_destination->>'lat')::numeric, (p_destination->>'lng')::numeric,
    p_passenger_count, p_scheduled_for, 'requested'::public.ride_status,
    p_distance_km, p_duration_minutes, v_base, v_distance, v_time, v_extra, 0, v_tax, 0, v_total, (v_fare->>'airportLevyAmount')::numeric, v_fare->'airportLevyRules',
    p_payment_method::public.payment_method, 'pending'::public.payment_status, v_rule.version,
    v_fare || jsonb_build_object('distanceKm',p_distance_km,'durationMinutes',p_duration_minutes,'passengerCount',p_passenger_count,'tollCharges',null,'tollPolicy','actual cost separately recorded and verified; excluded from fare quote','airportLevyAmount',(v_fare->>'airportLevyAmount')::numeric,'airportLevyRules',v_fare->'airportLevyRules'), p_idempotency_key, p_request_fingerprint
  ) ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING * INTO v_ride;

  IF NOT FOUND THEN
    SELECT * INTO v_ride FROM public.rides WHERE idempotency_key = p_idempotency_key;
    IF NOT FOUND OR v_ride.rider_id <> v_profile.id OR v_ride.idempotency_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
      RAISE EXCEPTION 'Request ID has already been used for a different booking request.';
    END IF;
    RETURN NEXT v_ride; RETURN;
  END IF;

  FOR v_stop IN SELECT value FROM jsonb_array_elements(coalesce(p_stops, '[]'::jsonb)) LOOP
    v_index := v_index + 1;
    IF nullif(trim(v_stop->>'address'), '') IS NULL OR (v_stop->>'lat')::numeric NOT BETWEEN 6 AND 37.5 OR (v_stop->>'lng')::numeric NOT BETWEEN 68 AND 97.5 THEN RAISE EXCEPTION 'Invalid intermediate stop.'; END IF;
    INSERT INTO public.ride_stops(ride_id, stop_order, address, lat, lng)
    VALUES (v_ride.id, v_index, left(trim(v_stop->>'address'), 500), (v_stop->>'lat')::numeric, (v_stop->>'lng')::numeric);
  END LOOP;
  RETURN NEXT v_ride;
END;
$$;
REVOKE ALL ON FUNCTION public.create_ride_with_fare_quote_v2(uuid,uuid,text,jsonb,jsonb,jsonb,text,integer,numeric,integer,integer,text,numeric,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_ride_with_fare_quote_v2(uuid,uuid,text,jsonb,jsonb,jsonb,text,integer,numeric,integer,integer,text,numeric,jsonb,timestamptz) TO service_role;


CREATE OR REPLACE FUNCTION public.guard_atomic_ride_acceptance()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'requested' AND NEW.status = 'accepted'
     AND coalesce(current_setting('rideblue.accepting_ride', true), 'false') <> 'true' THEN
    RAISE EXCEPTION 'Ride acceptance must use the atomic accept_ride_request operation.';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_atomic_ride_acceptance ON public.rides;
CREATE TRIGGER trg_guard_atomic_ride_acceptance BEFORE UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.guard_atomic_ride_acceptance();


-- Notify only online, approved drivers whose vehicle category can serve the request.
CREATE OR REPLACE FUNCTION public.emit_ride_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rider_auth_id uuid;
  driver_auth_id uuid;
  driver_profile_id uuid;
  notification_title text;
  notification_message text;
  notification_type text := 'info';
  notification_link text;
BEGIN
  SELECT nullif(p.user_id, '')::uuid INTO rider_auth_id FROM public.profiles p WHERE p.id = NEW.rider_id;
  IF TG_OP = 'INSERT' THEN
    IF rider_auth_id IS NOT NULL THEN
      INSERT INTO public.notifications(recipient_user_id, ride_id, target_role, title, message, type, link)
      VALUES (rider_auth_id, NEW.id, 'rider', 'Ride request submitted', 'Your ride request was saved. It is not confirmed until a driver accepts it.', 'info', '/rider/tracking/' || NEW.id::text);
    END IF;
    INSERT INTO public.notifications(recipient_user_id, ride_id, target_role, title, message, type, link)
    SELECT nullif(p.user_id, '')::uuid, NEW.id, 'driver', 'Ride request available', 'A new ride request is available. Review the trip details before accepting.', 'info', '/driver/requests'
    FROM public.drivers d JOIN public.profiles p ON p.id = d.profile_id
    WHERE d.approval_status = 'approved' AND d.is_online = true AND d.vehicle_category = NEW.vehicle_category AND nullif(p.user_id, '') IS NOT NULL;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' THEN
      notification_title := 'Driver accepted your ride'; notification_message := 'A driver has accepted your booking.'; notification_type := 'success'; notification_link := '/rider/tracking/' || NEW.id::text;
    ELSIF NEW.status = 'driver_arriving' THEN
      notification_title := 'Driver arriving'; notification_message := 'Your assigned driver is on the way to the pickup point.'; notification_link := '/rider/tracking/' || NEW.id::text;
    ELSIF NEW.status = 'in_progress' THEN
      notification_title := 'Trip started'; notification_message := 'Your trip has started.'; notification_type := 'success'; notification_link := '/rider/tracking/' || NEW.id::text;
    ELSIF NEW.status = 'completed' THEN
      notification_title := 'Trip completed'; notification_message := 'Your trip is marked complete. You can now submit a rating.'; notification_type := 'success'; notification_link := '/rider/history';
    ELSIF NEW.status = 'cancelled' THEN
      notification_title := 'Ride cancelled'; notification_message := 'Your booking has been cancelled.'; notification_type := 'warning'; notification_link := '/rider/history';
    ELSIF NEW.status::text = 'rejected' THEN
      notification_title := 'Ride request rejected'; notification_message := 'Your ride request was rejected.'; notification_type := 'warning'; notification_link := '/rider/history';
    END IF;
    IF notification_title IS NOT NULL AND rider_auth_id IS NOT NULL THEN
      INSERT INTO public.notifications(recipient_user_id, ride_id, target_role, title, message, type, link)
      VALUES (rider_auth_id, NEW.id, 'rider', notification_title, notification_message, notification_type, notification_link);
    END IF;
    IF NEW.driver_id IS NOT NULL AND NEW.driver_id IS DISTINCT FROM OLD.driver_id THEN
      SELECT d.profile_id INTO driver_profile_id FROM public.drivers d WHERE d.id = NEW.driver_id;
      SELECT nullif(p.user_id, '')::uuid INTO driver_auth_id FROM public.profiles p WHERE p.id = driver_profile_id;
      IF driver_auth_id IS NOT NULL THEN
        INSERT INTO public.notifications(recipient_user_id, ride_id, target_role, title, message, type, link)
        VALUES (driver_auth_id, NEW.id, 'driver', 'Ride assigned to you', 'You accepted a ride request. Review the trip details.', 'success', '/driver/active-trip');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_emit_ride_notifications ON public.rides;
CREATE TRIGGER trg_emit_ride_notifications AFTER INSERT OR UPDATE OF status, driver_id ON public.rides FOR EACH ROW EXECUTE FUNCTION public.emit_ride_notifications();

-- Drivers may only see requests matching their registered vehicle category.
DROP POLICY IF EXISTS "Riders and drivers can view relevant rides" ON public.rides;
DROP POLICY IF EXISTS "Riders and eligible drivers can view relevant rides" ON public.rides;
CREATE POLICY "Riders and eligible drivers can view relevant rides" ON public.rides
  FOR SELECT TO authenticated USING (
    rider_id = public.current_profile_id()
    OR driver_id = public.current_driver_id()
    OR (status = 'requested' AND public.is_approved_driver() AND EXISTS (
      SELECT 1 FROM public.drivers d WHERE d.id = public.current_driver_id() AND d.vehicle_category = rides.vehicle_category
    ))
    OR public.is_admin()
  );


-- ===== Source migration 07_gps_payment_security_and_audit.sql =====
-- RideBlue Phase 3-6 hardening. Additive migration; does not seed operational data.
-- Review against the target database before applying. Never run automatically in production.

-- Preserve distinct Razorpay order/payment references and request idempotency.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_order_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_payment_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS captured_at timestamptz;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'unreconciled'
  CHECK (reconciliation_status IN ('unreconciled','matched','mismatch','requires_review'));

-- Intentionally omitted order-id backfill: provider_transaction_id semantics must be verified first.

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_order_unique
  ON public.payments(provider, provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_payment_unique
  ON public.payments(provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_ride_idempotency_unique
  ON public.payments(ride_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.processed_payment_webhooks
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'processed'
    CHECK (processing_status IN ('processing','processed','failed'));
ALTER TABLE public.processed_payment_webhooks
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0);
ALTER TABLE public.processed_payment_webhooks
  ADD COLUMN IF NOT EXISTS last_error text;
-- Existing rows are historical completed events; retain that interpretation.
UPDATE public.processed_payment_webhooks SET processing_status = 'processed' WHERE processing_status IS NULL;

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider = 'razorpay'),
  provider_refund_id text,
  idempotency_key uuid NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 5 AND 1000),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','completed','failed','requires_review')),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  provider_updated_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, idempotency_key),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_refunds_provider_refund_unique
  ON public.payment_refunds(provider, provider_refund_id) WHERE provider_refund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_refunds_ride_created ON public.payment_refunds(ride_id, created_at DESC);
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants can read refunds" ON public.payment_refunds;
DROP POLICY IF EXISTS "No direct refund mutations" ON public.payment_refunds;
DROP POLICY IF EXISTS "Participants can read refunds" ON public.payment_refunds;
CREATE POLICY "Participants can read refunds" ON public.payment_refunds FOR SELECT TO authenticated
USING (public.is_admin() OR EXISTS (
  SELECT 1 FROM public.rides r
  WHERE r.id = payment_refunds.ride_id
    AND (r.rider_id = public.current_profile_id() OR r.driver_id = public.current_driver_id())
));
DROP POLICY IF EXISTS "No direct refund mutations" ON public.payment_refunds;
CREATE POLICY "No direct refund mutations" ON public.payment_refunds FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

-- Durable financial audit trail. Amounts are observations/transactions, not dashboard estimates.
CREATE TABLE IF NOT EXISTS public.financial_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES public.rides(id) ON DELETE RESTRICT,
  payment_id uuid REFERENCES public.payments(id) ON DELETE RESTRICT,
  refund_id uuid REFERENCES public.payment_refunds(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('order_created','payment_captured','payment_failed','refund_requested','refund_updated','reconciliation_mismatch','toll_verified','toll_settled')),
  provider_reference text,
  amount numeric(10,2) CHECK (amount IS NULL OR amount >= 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  actor_user_id uuid REFERENCES auth.users(id),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_financial_audit_ride_created ON public.financial_audit_events(ride_id, created_at DESC);
ALTER TABLE public.financial_audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authorized participants read financial audit" ON public.financial_audit_events;
DROP POLICY IF EXISTS "Authorized participants read financial audit" ON public.financial_audit_events;
CREATE POLICY "Authorized participants read financial audit" ON public.financial_audit_events FOR SELECT TO authenticated
USING (public.is_admin() OR EXISTS (
  SELECT 1 FROM public.rides r WHERE r.id = financial_audit_events.ride_id
  AND (r.rider_id = public.current_profile_id() OR r.driver_id = public.current_driver_id())
));
DROP POLICY IF EXISTS "No client financial audit writes" ON public.financial_audit_events;
DROP POLICY IF EXISTS "No client financial audit writes" ON public.financial_audit_events;
CREATE POLICY "No client financial audit writes" ON public.financial_audit_events FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

-- Atomic payment state reconciliation: one transaction updates payment and ride.
CREATE OR REPLACE FUNCTION public.record_verified_razorpay_payment(
  p_ride_id uuid, p_order_id text, p_payment_id text, p_amount_paise bigint, p_currency text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_payment public.payments%ROWTYPE; v_amount_paise bigint;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Trusted payment reconciliation required.'; END IF;
  IF p_ride_id IS NULL OR nullif(trim(p_order_id),'') IS NULL OR nullif(trim(p_payment_id),'') IS NULL
     OR p_amount_paise <= 0 OR p_currency <> 'INR' THEN RAISE EXCEPTION 'Invalid verified payment details.'; END IF;
  SELECT * INTO v_payment FROM public.payments
   WHERE ride_id=p_ride_id AND provider='razorpay' AND provider_order_id=p_order_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment order was not found for this ride.'; END IF;
  v_amount_paise := round(v_payment.amount * 100)::bigint;
  IF v_amount_paise <> p_amount_paise OR v_payment.currency <> p_currency THEN
    UPDATE public.payments SET reconciliation_status='mismatch', updated_at=now() WHERE id=v_payment.id;
    INSERT INTO public.financial_audit_events(ride_id,payment_id,event_type,provider_reference,amount,currency,details)
    VALUES(p_ride_id,v_payment.id,'reconciliation_mismatch',p_payment_id,v_payment.amount,p_currency,jsonb_build_object('order_id',p_order_id,'reason','amount_or_currency_mismatch'));
    RETURN jsonb_build_object('ok',false,'reason','amount_or_currency_mismatch');
  END IF;
  IF v_payment.status='paid' AND v_payment.provider_payment_id=p_payment_id THEN
    RETURN jsonb_build_object('ok',true,'duplicate',true,'payment_id',v_payment.id);
  END IF;
  IF v_payment.status NOT IN ('pending','failed') OR v_payment.provider_payment_id IS NOT NULL THEN RAISE EXCEPTION 'Payment is not eligible for capture reconciliation.'; END IF;
  UPDATE public.payments SET status='paid', provider_payment_id=p_payment_id,
    provider_transaction_id=p_payment_id, captured_at=coalesce(captured_at,now()),
    reconciliation_status='matched', updated_at=now() WHERE id=v_payment.id;
  UPDATE public.rides SET payment_status='paid' WHERE id=p_ride_id;
  INSERT INTO public.financial_audit_events(ride_id,payment_id,event_type,provider_reference,amount,currency,details)
  VALUES(p_ride_id,v_payment.id,'payment_captured',p_payment_id,v_payment.amount,p_currency,jsonb_build_object('order_id',p_order_id));
  RETURN jsonb_build_object('ok',true,'duplicate',false,'payment_id',v_payment.id);
END; $$;
REVOKE ALL ON FUNCTION public.record_verified_razorpay_payment(uuid,text,text,bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_razorpay_payment(uuid,text,text,bigint,text) TO service_role;

-- Location visibility ends with the active trip. Backend writes remain the only allowed write path.
DROP POLICY IF EXISTS "Riders and drivers can view active ride location" ON public.driver_locations;
DROP POLICY IF EXISTS "Authorized active trip participants can view location" ON public.driver_locations;
CREATE POLICY "Authorized active trip participants can view location" ON public.driver_locations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.rides r WHERE r.id=driver_locations.ride_id
  AND r.status IN ('accepted','driver_arriving','in_progress')
  AND (r.rider_id=public.current_profile_id() OR r.driver_id=public.current_driver_id() OR public.is_admin())
));

-- Keep client financial writes prohibited regardless of older permissive policies.
DROP POLICY IF EXISTS "No direct client insert on payments" ON public.payments;
DROP POLICY IF EXISTS "No direct client update on payments" ON public.payments;
DROP POLICY IF EXISTS "No direct client delete on payments" ON public.payments;
DROP POLICY IF EXISTS "No direct client insert on payments" ON public.payments;
CREATE POLICY "No direct client insert on payments" ON public.payments FOR INSERT TO anon, authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct client update on payments" ON public.payments;
CREATE POLICY "No direct client update on payments" ON public.payments FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No direct client delete on payments" ON public.payments;
CREATE POLICY "No direct client delete on payments" ON public.payments FOR DELETE TO anon, authenticated USING (false);

-- Payment secrets and all provider reconciliation remain server-only. No operational data is seeded.


-- Enforce trip assignment and valid time bounds at the database boundary as well as in Express.
CREATE OR REPLACE FUNCTION public.validate_driver_location_trip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text; v_driver uuid;
BEGIN
  IF NEW.lat NOT BETWEEN 6.0 AND 37.5 OR NEW.lng NOT BETWEEN 68.0 AND 97.5 THEN
    RAISE EXCEPTION 'GPS coordinates are outside the supported geographic bounds.';
  END IF;
  IF NEW.recorded_at > now() + interval '30 seconds' OR NEW.recorded_at < now() - interval '2 minutes' THEN
    RAISE EXCEPTION 'GPS update timestamp is stale or in the future.';
  END IF;
  SELECT status, driver_id INTO v_status, v_driver FROM public.rides WHERE id = NEW.ride_id;
  IF v_status NOT IN ('accepted','driver_arriving','in_progress') OR v_driver IS DISTINCT FROM NEW.driver_id THEN
    RAISE EXCEPTION 'GPS updates are permitted only for the assigned driver on an active trip.';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_validate_driver_location_trip ON public.driver_locations;
CREATE TRIGGER trg_validate_driver_location_trip BEFORE INSERT OR UPDATE ON public.driver_locations
FOR EACH ROW EXECUTE FUNCTION public.validate_driver_location_trip();
REVOKE ALL ON FUNCTION public.validate_driver_location_trip() FROM PUBLIC, anon, authenticated;


-- Limit direct driver-row visibility to the owner, admins, and riders on rides assigned to that driver.
-- Riders use a deliberately limited directory view instead of reading document/contact fields from drivers.
DROP POLICY IF EXISTS "Public can view approved drivers" ON public.drivers;
DROP POLICY IF EXISTS "Drivers and admins view private driver rows" ON public.drivers;
DROP POLICY IF EXISTS "Drivers and admins view private driver rows" ON public.drivers;
CREATE POLICY "Drivers and admins view private driver rows" ON public.drivers FOR SELECT TO authenticated
USING (
  profile_id = public.current_profile_id()
  OR public.is_admin()
);
CREATE OR REPLACE VIEW public.public_driver_directory WITH (security_barrier = true) AS
SELECT d.id, d.profile_id, d.vehicle_category, d.vehicle_make_model, d.vehicle_plate, d.vehicle_year,
       d.approval_status, d.is_online, d.acceptance_rate, d.created_at,
       jsonb_build_object(
         'id', p.id, 'full_name', p.full_name,
         'avatar_url', p.avatar_url, 'rating', p.rating, 'total_trips', p.total_trips
       ) AS profile
FROM public.drivers d JOIN public.profiles p ON p.id = d.profile_id
WHERE d.approval_status = 'approved';
GRANT SELECT ON public.public_driver_directory TO authenticated;
REVOKE ALL ON public.public_driver_directory FROM anon;


-- A single in-flight order reservation per ride prevents concurrent clients from opening duplicate orders.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_unresolved_razorpay_order_reservation_per_ride
  ON public.payments(ride_id)
  WHERE provider='razorpay' AND status='pending' AND provider_order_id IS NULL;

-- Enforce refundable-balance reservation under a parent-payment row lock, not just in Express.
CREATE OR REPLACE FUNCTION public.enforce_refund_balance_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_payment_amount numeric(10,2); v_reserved numeric(10,2);
BEGIN
  SELECT amount INTO v_payment_amount FROM public.payments WHERE id=NEW.payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found for refund.'; END IF;
  SELECT coalesce(sum(amount),0) INTO v_reserved FROM public.payment_refunds
    WHERE payment_id=NEW.payment_id AND status IN ('requested','processing','completed','requires_review') AND id IS DISTINCT FROM NEW.id;
  IF v_reserved + NEW.amount > v_payment_amount THEN RAISE EXCEPTION 'Refund amount exceeds remaining refundable balance.'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_enforce_refund_balance_reservation ON public.payment_refunds;
CREATE TRIGGER trg_enforce_refund_balance_reservation BEFORE INSERT OR UPDATE OF payment_id, amount, status
ON public.payment_refunds FOR EACH ROW EXECUTE FUNCTION public.enforce_refund_balance_reservation();
REVOKE ALL ON FUNCTION public.enforce_refund_balance_reservation() FROM PUBLIC, anon, authenticated;

-- Do not expose every approved driver's profile/contact details to every authenticated user.
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own admin and ride participant profiles" ON public.profiles;
CREATE POLICY "Users can view own admin and ride participant profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()::text
  OR public.is_admin()
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

-- Idempotency tokens are globally unique, not merely unique within one ride/payment.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_global_unique
  ON public.payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_refunds_idempotency_global_unique
  ON public.payment_refunds(idempotency_key);

COMMIT;

-- After commit, run separate read-only verification queries from the inspection script.
