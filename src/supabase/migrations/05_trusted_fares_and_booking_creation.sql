-- RideBlue Phase 1: trusted pricing snapshots and atomic booking creation.
-- Review and apply only after backing up the target database. No pricing values are seeded.
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS extra_passenger_charge numeric(10,2) CHECK (extra_passenger_charge IS NULL OR extra_passenger_charge >= 0);
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS fare_breakdown jsonb;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS pricing_version integer;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS idempotency_fingerprint text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rides_idempotency_key_unique ON public.rides(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Only approved, online drivers may see and accept unassigned ride requests.
CREATE OR REPLACE FUNCTION public.is_approved_driver()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers d JOIN public.profiles p ON d.profile_id = p.id
    WHERE p.user_id = auth.uid()::text AND d.approval_status = 'approved' AND d.is_online = true
  );
$$;

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
