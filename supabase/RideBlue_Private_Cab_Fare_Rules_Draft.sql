-- RideBlue Private Cab Fare Policy — draft seed
-- IMPORTANT:
-- 1. Run in STAGING first; these are illustrative, unapproved tariff values.
-- 2. Rows are inserted inactive (active = false) so this script does not silently
--    activate production pricing.
-- 3. Inactive rows will not satisfy fare-quote code requiring active rules.
-- 4. This script does not configure airport_levy_rules, payment settings, or
--    production booking switches.
-- 5. The existing fare-rule version trigger may adjust version values; verify
--    stored rows after execution.
--
-- Supported categories: economy, sedan, suv, xl, airport_transfer.
-- Capacity values are draft values and must match actual approved vehicle capacity.

BEGIN;

INSERT INTO public.fare_rules (
    vehicle_category,
    base_fare,
    rate_per_km,
    rate_per_minute,
    minimum_fare,
    cancellation_fee,
    max_passengers,
    included_passengers,
    additional_passenger_fee,
    tax_rate,
    commission_rate,
    active,
    version,
    updated_by,
    effective_from,
    effective_until
)
VALUES
    ('economy',          40.00, 12.00, 1.00,  80.00,  50.00, 4, 4, 0.00, 0.05, 0.15, false, 1, NULL, now(), NULL),
    ('sedan',            60.00, 15.00, 1.20, 120.00, 60.00, 4, 4, 0.00, 0.05, 0.15, false, 1, NULL, now(), NULL),
    ('suv',             100.00, 20.00, 1.50, 180.00, 80.00, 6, 6, 0.00, 0.05, 0.15, false, 1, NULL, now(), NULL),
    ('xl',              140.00, 25.00, 2.00, 250.00,100.00, 8, 8, 0.00, 0.05, 0.15, false, 1, NULL, now(), NULL),
    ('airport_transfer',100.00, 18.00, 1.50, 200.00,100.00, 4, 4, 0.00, 0.05, 0.15, false, 1, NULL, now(), NULL)
ON CONFLICT (vehicle_category) DO NOTHING;

COMMIT;

-- Review the stored values after seeding:
SELECT
    vehicle_category,
    base_fare,
    rate_per_km,
    rate_per_minute,
    minimum_fare,
    cancellation_fee,
    max_passengers,
    included_passengers,
    additional_passenger_fee,
    tax_rate,
    commission_rate,
    active,
    version,
    effective_from,
    effective_until
FROM public.fare_rules
WHERE vehicle_category IN ('economy', 'sedan', 'suv', 'xl', 'airport_transfer')
ORDER BY CASE vehicle_category
    WHEN 'economy' THEN 1
    WHEN 'sedan' THEN 2
    WHEN 'suv' THEN 3
    WHEN 'xl' THEN 4
    WHEN 'airport_transfer' THEN 5
    ELSE 6
END;

-- APPROVAL STEP — DO NOT RUN UNTIL THE DRAFT PRICES/TAX/COMMISSION ARE APPROVED
-- and staging tests have passed. Prefer running this only in the intended
-- environment after a documented approval:
--
-- UPDATE public.fare_rules
-- SET active = true,
--     effective_from = now(),
--     effective_until = NULL
-- WHERE vehicle_category IN ('economy', 'sedan', 'suv', 'xl', 'airport_transfer');
--
-- Activating fare rules is NOT equivalent to enabling production bookings.
-- Keep booking/payment production controls disabled until the full release checks pass.
