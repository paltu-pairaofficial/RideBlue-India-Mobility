CREATE OR REPLACE FUNCTION public.calculate_fare_quote_v2(p_vehicle_category text, p_passenger_count integer, p_distance_km numeric, p_duration_minutes integer, p_expected_version integer, p_pickup_address text, p_destination_address text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$
