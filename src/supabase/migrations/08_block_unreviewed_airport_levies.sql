BEGIN;

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
  IF p_auth_user_id IS NULL OR p_idempotency_key IS NULL OR p_request_fingerprint IS NULL THEN
    RAISE EXCEPTION 'Authenticated user, request ID, and request fingerprint are required.';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_auth_user_id::text
  FOR SHARE;

  IF NOT FOUND OR v_profile.role <> 'rider' THEN
    RAISE EXCEPTION 'Only a verified rider can create a booking.';
  END IF;

  SELECT * INTO v_ride
  FROM public.rides
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_ride.rider_id <> v_profile.id
       OR v_ride.idempotency_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
      RAISE EXCEPTION 'Request ID has already been used for a different booking request.';
    END IF;
    RETURN NEXT v_ride;
    RETURN;
  END IF;

  IF jsonb_typeof(p_pickup) <> 'object'
     OR jsonb_typeof(p_destination) <> 'object'
     OR jsonb_typeof(coalesce(p_stops, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Invalid route input.';
  END IF;

  IF jsonb_array_length(coalesce(p_stops, '[]'::jsonb)) > 2 THEN
    RAISE EXCEPTION 'A maximum of two intermediate stops is allowed.';
  END IF;

  IF p_passenger_count IS NULL OR p_passenger_count < 1 OR p_passenger_count > 8
     OR p_distance_km IS NULL OR p_distance_km <= 0
     OR p_duration_minutes IS NULL OR p_duration_minutes <= 0
     OR p_payment_method IS NULL
     OR p_payment_method NOT IN ('cash','razorpay','upi') THEN
    RAISE EXCEPTION 'Invalid booking values.';
  END IF;

  IF nullif(trim(p_pickup->>'address'), '') IS NULL
     OR nullif(trim(p_destination->>'address'), '') IS NULL
     OR (p_pickup->>'lat')::numeric NOT BETWEEN 6 AND 37.5
     OR (p_destination->>'lat')::numeric NOT BETWEEN 6 AND 37.5
     OR (p_pickup->>'lng')::numeric NOT BETWEEN 68 AND 97.5
     OR (p_destination->>'lng')::numeric NOT BETWEEN 68 AND 97.5 THEN
    RAISE EXCEPTION 'Pickup and destination must be valid locations in India.';
  END IF;

  SELECT * INTO v_rule
  FROM public.fare_rules
  WHERE vehicle_category = p_vehicle_category
    AND active = true
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active fare rule exists for this vehicle category.';
  END IF;

  IF v_rule.version <> p_pricing_version THEN
    RAISE EXCEPTION 'Fare rule version changed. Request a new quote.';
  END IF;

  IF p_passenger_count > v_rule.max_passengers THEN
    RAISE EXCEPTION 'Passenger count exceeds this vehicle capacity.';
  END IF;
  v_fare := public.calculate_fare_quote_v2(
    p_vehicle_category,
    p_passenger_count,
    p_distance_km,
    p_duration_minutes,
    p_pricing_version,
    p_pickup->>'address',
    p_destination->>'address'
  );

  -- Block booking when airport levy verification is required.
  IF coalesce(
    (v_fare->>'airportLevyVerificationRequired')::boolean,
    false
  ) THEN
    RAISE EXCEPTION
      'Airport levy verification is required. Booking cannot be created until reviewed.';
  END IF;

  -- Verify that the quoted airport levy has not changed.
  IF round((v_fare->>'airportLevyAmount')::numeric, 2)
       IS DISTINCT FROM round(coalesce(p_expected_airport_levy, 0), 2)
     OR (v_fare->'airportLevyRules')
       IS DISTINCT FROM coalesce(p_expected_airport_levy_rules, '[]'::jsonb) THEN
    RAISE EXCEPTION 'Airport levy rules changed. Request a fresh quote.';
  END IF;

  
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
    extra_passenger_charge, toll_charges, taxes, discount, total_fare,
    airport_levy_amount, airport_levy_rule_snapshot, payment_method,
    payment_status, pricing_version, fare_breakdown, idempotency_key, idempotency_fingerprint
  ) VALUES (
    v_code, v_profile.id, p_vehicle_category::public.vehicle_category,
    left(trim(p_pickup->>'address'), 500), (p_pickup->>'lat')::numeric, (p_pickup->>'lng')::numeric,
    left(trim(p_destination->>'address'), 500), (p_destination->>'lat')::numeric, (p_destination->>'lng')::numeric,
    p_passenger_count, p_scheduled_for, 'requested'::public.ride_status,
    p_distance_km, p_duration_minutes, v_base, v_distance, v_time, v_extra,
    0, v_tax, 0, v_total, (v_fare->>'airportLevyAmount')::numeric,
    v_fare->'airportLevyRules', p_payment_method::public.payment_method,
    'pending'::public.payment_status, v_rule.version,
    v_fare || jsonb_build_object(
      'distanceKm', p_distance_km,
      'durationMinutes', p_duration_minutes,
      'passengerCount', p_passenger_count,
      'tollCharges', null,
      'tollPolicy', 'actual cost separately recorded and verified; excluded from fare quote',
      'airportLevyAmount', (v_fare->>'airportLevyAmount')::numeric,
      'airportLevyRules', v_fare->'airportLevyRules'
    ),
    p_idempotency_key, p_request_fingerprint
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING * INTO v_ride;

  IF NOT FOUND THEN
    SELECT * INTO v_ride
    FROM public.rides
    WHERE idempotency_key = p_idempotency_key;

    IF NOT FOUND
       OR v_ride.rider_id <> v_profile.id
       OR v_ride.idempotency_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
      RAISE EXCEPTION 'Request ID has already been used for a different booking request.';
    END IF;

    RETURN NEXT v_ride;
    RETURN;
  END IF;

  FOR v_stop IN
    SELECT value FROM jsonb_array_elements(coalesce(p_stops, '[]'::jsonb))
  LOOP
    v_index := v_index + 1;

    IF nullif(trim(v_stop->>'address'), '') IS NULL
       OR (v_stop->>'lat')::numeric NOT BETWEEN 6 AND 37.5
       OR (v_stop->>'lng')::numeric NOT BETWEEN 68 AND 97.5 THEN
      RAISE EXCEPTION 'Invalid intermediate stop.';
    END IF;

    INSERT INTO public.ride_stops(ride_id, stop_order, address, lat, lng)
    VALUES (
      v_ride.id, v_index, left(trim(v_stop->>'address'), 500),
      (v_stop->>'lat')::numeric, (v_stop->>'lng')::numeric
    );
  END LOOP;

  RETURN NEXT v_ride;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_ride_with_fare_quote_v2(
  uuid,uuid,text,jsonb,jsonb,jsonb,text,integer,numeric,integer,integer,text,numeric,jsonb,timestamptz
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_ride_with_fare_quote_v2(
  uuid,uuid,text,jsonb,jsonb,jsonb,text,integer,numeric,integer,integer,text,numeric,jsonb,timestamptz
) TO service_role;

COMMIT;