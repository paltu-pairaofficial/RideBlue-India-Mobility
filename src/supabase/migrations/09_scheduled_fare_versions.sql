
BEGIN;

-- Add a unique ID for every fare-rule version.
ALTER TABLE public.fare_rules
  ADD COLUMN IF NOT EXISTS id uuid;

UPDATE public.fare_rules
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.fare_rules
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.fare_rules
  ALTER COLUMN id SET NOT NULL;

-- Stop if category/version pairs are duplicated.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.fare_rules
    GROUP BY vehicle_category, version
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate vehicle_category/version pairs exist.';
  END IF;
END $$;

-- Replace the old category-only primary key.
ALTER TABLE public.fare_rules
  DROP CONSTRAINT fare_rules_pkey;

ALTER TABLE public.fare_rules
  ADD CONSTRAINT fare_rules_pkey PRIMARY KEY (id);

-- Keep version numbers unique within each category.
CREATE UNIQUE INDEX IF NOT EXISTS
  fare_rules_category_version_uidx
ON public.fare_rules (vehicle_category, version);

COMMIT;
