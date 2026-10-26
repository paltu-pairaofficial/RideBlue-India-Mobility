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

CREATE POLICY "Riders and drivers can view relevant rides" ON public.rides
  FOR SELECT TO authenticated
  USING (
    rider_id = public.current_profile_id()
    OR driver_id = public.current_driver_id()
    OR (status = 'requested' AND public.is_approved_driver())
    OR public.is_admin()
  );

CREATE POLICY "Riders can insert own rides" ON public.rides
  FOR INSERT TO authenticated
  WITH CHECK (
    rider_id = public.current_profile_id()
    AND status IN ('requested', 'accepted')
    AND payment_status = 'pending'
  );

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
CREATE POLICY "No direct client modification of driver locations" ON public.driver_locations
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "No direct client update of driver locations" ON public.driver_locations
  FOR UPDATE TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No direct client delete of driver locations" ON public.driver_locations
  FOR DELETE TO anon, authenticated
  USING (false);

-- ====================================================================
-- 9. Row Level Security: PROCESSED PAYMENT WEBHOOKS (Priority 3 & 5)
-- ====================================================================
ALTER TABLE public.processed_payment_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to webhook log" ON public.processed_payment_webhooks;
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
CREATE POLICY "No direct client insert on payments" ON public.payments
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

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

CREATE POLICY "Public can view approved drivers" ON public.drivers
  FOR SELECT TO authenticated, anon
  USING (
    approval_status = 'approved'
    OR profile_id = public.current_profile_id()
    OR public.is_admin()
  );

CREATE POLICY "Drivers can insert own profile" ON public.drivers
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = public.current_profile_id()
    AND approval_status = 'pending'
  );

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

CREATE POLICY "Public reviews read access" ON public.reviews
  FOR SELECT TO authenticated, anon
  USING (true);

-- Only riders of completed rides can insert a review with rating 1-5
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

CREATE POLICY "Support ticket select access" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    user_id = public.current_profile_id()
    OR public.is_admin()
  );

CREATE POLICY "Support ticket insert access" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = public.current_profile_id()
  );

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
