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
CREATE POLICY "Read applicable airport levy rules" ON public.airport_levy_rules FOR SELECT TO authenticated USING (active OR public.is_admin());
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
CREATE POLICY "Participants and admins read toll adjustments" ON public.ride_toll_adjustments FOR SELECT TO authenticated USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.rides r
    JOIN public.profiles p ON p.id = r.rider_id
    LEFT JOIN public.drivers d ON d.id = r.driver_id
    LEFT JOIN public.profiles dp ON dp.id = d.profile_id
    WHERE r.id = ride_toll_adjustments.ride_id AND (p.user_id = auth.uid()::text OR dp.user_id = auth.uid()::text)
  )
);
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
  v_fare := public.calculate_fare_quote_v2(p_vehicle_category, p_passenger_count, p_distance_km, p_duration_minutes, p_pricing_version, p_pickup->>'address', p_destination->>'address');

IF coalesce(
  (v_fare->>'airportLevyVerificationRequired')::boolean,
  false
) THEN
  RAISE EXCEPTION
    'Airport levy verification is required. Booking cannot be created until reviewed.';
END IF;

IF round((v_fare->>'airportLevyAmount')::numeric,2) IS DISTINCT FROM round(coalesce(p_expected_airport_levy,0),2) OR (v_fare->'airportLevyRules') IS DISTINCT FROM coalesce(p_expected_airport_levy_rules,'[]'::jsonb) THEN RAISE EXCEPTION 'Airport levy rules changed. Request a fresh quote.'; END IF;
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
CREATE POLICY "Riders and eligible drivers can view relevant rides" ON public.rides
  FOR SELECT TO authenticated USING (
    rider_id = public.current_profile_id()
    OR driver_id = public.current_driver_id()
    OR (status = 'requested' AND public.is_approved_driver() AND EXISTS (
      SELECT 1 FROM public.drivers d WHERE d.id = public.current_driver_id() AND d.vehicle_category = rides.vehicle_category
    ))
    OR public.is_admin()
  );
