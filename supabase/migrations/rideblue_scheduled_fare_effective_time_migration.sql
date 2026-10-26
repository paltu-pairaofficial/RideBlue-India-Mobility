-- RideBlue targeted migration: scheduled-time fare and airport-levy evaluation.
-- Review against the LIVE schema and take a database backup before applying.
-- Existing rides and their stored fare snapshots are not updated by this migration.
BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_fare_quote_at(
  p_vehicle_category text,
  p_passenger_count integer,
  p_distance_km numeric,
  p_duration_minutes integer,
  p_expected_version integer,
  p_effective_at timestamptz
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
  SELECT * INTO v_rule
  FROM public.fare_rules
  WHERE vehicle_category = p_vehicle_category
    AND active = true
    AND effective_from <= p_effective_at
    AND (effective_until IS NULL OR effective_until > p_effective_at)
  ORDER BY effective_from DESC, version DESC
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No approved fare rule is effective for this vehicle category at the requested pickup time.'; END IF;
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

CREATE OR REPLACE FUNCTION public.calculate_fare_quote_v2_at(
  p_vehicle_category text, p_passenger_count integer, p_distance_km numeric, p_duration_minutes integer,
  p_expected_version integer, p_pickup_address text, p_destination_address text, p_effective_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fare jsonb; v_pricing_rule public.fare_rules%ROWTYPE; v_levy numeric(10,2) := 0; v_taxable_levy numeric(10,2) := 0;
  v_rules jsonb := '[]'::jsonb; v_tax numeric(10,2); v_total numeric(10,2); v_tax_rate numeric; v_needs_verification boolean := false;
BEGIN
  IF nullif(trim(p_pickup_address),'') IS NULL OR nullif(trim(p_destination_address),'') IS NULL THEN RAISE EXCEPTION 'Pickup and destination addresses are required for airport levy evaluation.'; END IF;
  SELECT * INTO v_pricing_rule
  FROM public.fare_rules
  WHERE vehicle_category = p_vehicle_category AND active = true
    AND effective_from <= p_effective_at
    AND (effective_until IS NULL OR effective_until > p_effective_at)
  ORDER BY effective_from DESC, version DESC
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active fare rule is effective for this vehicle category at this time.'; END IF;
  IF p_expected_version IS NOT NULL AND v_pricing_rule.version <> p_expected_version THEN RAISE EXCEPTION 'Fare rule version changed. Request a new quote.'; END IF;
  v_fare := public.calculate_fare_quote_at(p_vehicle_category,p_passenger_count,p_distance_km,p_duration_minutes,p_expected_version,p_effective_at);
  WITH endpoints AS (
    SELECT 'pickup'::text AS endpoint, lower(p_pickup_address) AS address
    UNION ALL SELECT 'dropoff', lower(p_destination_address)
  ), matched AS (
    SELECT e.endpoint, r.id, r.airport_code, r.airport_name, r.levy_amount, r.taxable, r.version,
      row_number() OVER (PARTITION BY e.endpoint ORDER BY (r.vehicle_category IS NOT NULL) DESC,
        (SELECT max(length(trim(term))) FROM unnest(r.match_terms) term WHERE length(trim(term)) >= 3 AND e.address LIKE '%' || lower(trim(term)) || '%') DESC,
        r.effective_from DESC, r.version DESC) AS rule_rank
    FROM endpoints e JOIN public.airport_levy_rules r ON r.active = true
      AND r.effective_from <= p_effective_at AND (r.effective_until IS NULL OR r.effective_until > p_effective_at)
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


-- Compatibility wrapper for existing callers of the original five-argument fare function.
CREATE OR REPLACE FUNCTION public.calculate_fare_quote(
  p_vehicle_category text, p_passenger_count integer, p_distance_km numeric,
  p_duration_minutes integer, p_expected_version integer DEFAULT NULL
) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.calculate_fare_quote_at(p_vehicle_category, p_passenger_count, p_distance_km,
    p_duration_minutes, p_expected_version, now());
$$;
REVOKE ALL ON FUNCTION public.calculate_fare_quote_at(text,integer,numeric,integer,integer,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_fare_quote_at(text,integer,numeric,integer,integer,timestamptz) TO service_role;

-- Compatibility wrapper for existing seven-argument v2 callers; these are immediate quotes.
CREATE OR REPLACE FUNCTION public.calculate_fare_quote_v2(
  p_vehicle_category text, p_passenger_count integer, p_distance_km numeric, p_duration_minutes integer,
  p_expected_version integer, p_pickup_address text, p_destination_address text
) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.calculate_fare_quote_v2_at(p_vehicle_category, p_passenger_count, p_distance_km,
    p_duration_minutes, p_expected_version, p_pickup_address, p_destination_address, now());
$$;
REVOKE ALL ON FUNCTION public.calculate_fare_quote_v2_at(text,integer,numeric,integer,integer,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_fare_quote_v2_at(text,integer,numeric,integer,integer,text,text,timestamptz) TO service_role;


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
  v_effective_at timestamptz := coalesce(p_scheduled_for, now());
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

  SELECT * INTO v_rule
  FROM public.fare_rules
  WHERE vehicle_category = p_vehicle_category AND active = true
    AND effective_from <= v_effective_at
    AND (effective_until IS NULL OR effective_until > v_effective_at)
  ORDER BY effective_from DESC, version DESC
  LIMIT 1
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active fare rule exists for this vehicle category.'; END IF;
  IF v_rule.version <> p_pricing_version THEN RAISE EXCEPTION 'Fare rule version changed. Request a new quote.'; END IF;
  IF p_passenger_count > v_rule.max_passengers THEN RAISE EXCEPTION 'Passenger count exceeds this vehicle capacity.'; END IF;

  v_fare := public.calculate_fare_quote_v2_at(
    p_vehicle_category, p_passenger_count, p_distance_km, p_duration_minutes,
    p_pricing_version, p_pickup->>'address', p_destination->>'address', v_effective_at
  );

IF coalesce(
  (v_fare->>'airportLevyVerificationRequired')::boolean,
  false
) THEN
  RAISE EXCEPTION
    'Airport levy verification is required. Booking cannot be created until reviewed.';
END IF;

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

COMMIT;
