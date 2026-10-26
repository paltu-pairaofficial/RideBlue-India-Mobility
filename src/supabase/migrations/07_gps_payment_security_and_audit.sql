-- RideBlue Phase 3-6 hardening. Additive migration; does not seed operational data.
-- Review against the target database before applying. Never run automatically in production.

-- Preserve distinct Razorpay order/payment references and request idempotency.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_order_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_payment_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS captured_at timestamptz;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'unreconciled'
  CHECK (reconciliation_status IN ('unreconciled','matched','mismatch','requires_review'));

-- Backfill only identifiers already stored by the application; no new payment claims are created.
UPDATE public.payments
SET provider_order_id = provider_transaction_id
WHERE provider = 'razorpay' AND provider_order_id IS NULL AND status = 'pending';

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
CREATE POLICY "Participants can read refunds" ON public.payment_refunds FOR SELECT TO authenticated
USING (public.is_admin() OR EXISTS (
  SELECT 1 FROM public.rides r
  WHERE r.id = payment_refunds.ride_id
    AND (r.rider_id = public.current_profile_id() OR r.driver_id = public.current_driver_id())
));
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
CREATE POLICY "Authorized participants read financial audit" ON public.financial_audit_events FOR SELECT TO authenticated
USING (public.is_admin() OR EXISTS (
  SELECT 1 FROM public.rides r WHERE r.id = financial_audit_events.ride_id
  AND (r.rider_id = public.current_profile_id() OR r.driver_id = public.current_driver_id())
));
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
CREATE POLICY "No direct client insert on payments" ON public.payments FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No direct client update on payments" ON public.payments FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
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
