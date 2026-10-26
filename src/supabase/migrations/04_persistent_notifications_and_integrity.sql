-- RideBlue migration 04: account-isolated, database-backed notifications and integrity guards.
-- Apply after migrations 01-03 in the Supabase SQL editor or migration runner.


-- Remove misleading default metrics for accounts with no completed activity.
ALTER TABLE public.profiles ALTER COLUMN rating DROP DEFAULT;
ALTER TABLE public.drivers ALTER COLUMN acceptance_rate DROP DEFAULT;
UPDATE public.profiles SET rating = NULL WHERE total_trips = 0;
UPDATE public.drivers d SET acceptance_rate = NULL
WHERE NOT EXISTS (SELECT 1 FROM public.rides r WHERE r.driver_id = d.id);

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
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (recipient_user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (recipient_user_id = auth.uid()) WITH CHECK (recipient_user_id = auth.uid());
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (recipient_user_id = auth.uid());
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
CREATE POLICY "Read active fare rules" ON public.fare_rules FOR SELECT TO authenticated USING (active = true OR public.is_admin());
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
CREATE POLICY "Admins manage platform settings" ON public.platform_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Coupon records are visible only when active and valid; only admins may create or change them.
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read active valid promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins manage promo codes" ON public.promo_codes;
CREATE POLICY "Read active valid promo codes" ON public.promo_codes FOR SELECT TO authenticated USING ((is_active = true AND valid_until > now()) OR public.is_admin());
CREATE POLICY "Admins manage promo codes" ON public.promo_codes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
