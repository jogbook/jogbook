CREATE OR REPLACE FUNCTION public.guard_booking_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _recent int;
BEGIN
  -- Never trust the client for ownership: link to the signed-in booker, if any.
  NEW.client_user_id := auth.uid();
  NEW.client_email := lower(trim(NEW.client_email));
  NEW.client_name := trim(NEW.client_name);

  IF length(NEW.client_name) < 1 OR length(NEW.client_name) > 120 THEN
    RAISE EXCEPTION 'Please enter a valid name' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.client_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(NEW.client_email) > 255 THEN
    RAISE EXCEPTION 'Please enter a valid email' USING ERRCODE = 'check_violation';
  END IF;
  IF length(coalesce(NEW.client_phone, '')) > 40 OR length(coalesce(NEW.message, '')) > 2000 THEN
    RAISE EXCEPTION 'Request is too long' USING ERRCODE = 'check_violation';
  END IF;
  IF coalesce(NEW.message, '') ~* '(https?://\S+.*){3,}' THEN
    RAISE EXCEPTION 'Too many links in message' USING ERRCODE = 'check_violation';
  END IF;

  -- Rate limits: 3 per email per DJ per hour, 10 per email per day, 30 per DJ per hour.
  SELECT count(*) INTO _recent FROM public.booking_requests
   WHERE client_email = NEW.client_email AND dj_id = NEW.dj_id AND created_at > now() - interval '1 hour';
  IF _recent >= 3 THEN RAISE EXCEPTION 'Too many requests — please try again later' USING ERRCODE = 'P0001'; END IF;

  SELECT count(*) INTO _recent FROM public.booking_requests
   WHERE client_email = NEW.client_email AND created_at > now() - interval '1 day';
  IF _recent >= 10 THEN RAISE EXCEPTION 'Too many requests — please try again later' USING ERRCODE = 'P0001'; END IF;

  SELECT count(*) INTO _recent FROM public.booking_requests
   WHERE dj_id = NEW.dj_id AND created_at > now() - interval '1 hour';
  IF _recent >= 30 THEN RAISE EXCEPTION 'This DJ is receiving a lot of requests — please try again later' USING ERRCODE = 'P0001'; END IF;

  -- New requests always start clean; payment fields are DJ/server controlled.
  NEW.status := 'new';
  NEW.amount_paid := 0;
  NEW.deposit_paid_amount := 0;
  NEW.payment_state := 'UNPAID';
  NEW.deposit_payment_status := 'PENDING';
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_booking_request() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS booking_requests_guard ON public.booking_requests;
CREATE TRIGGER booking_requests_guard
  BEFORE INSERT ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_request();

CREATE INDEX IF NOT EXISTS booking_requests_email_created_idx ON public.booking_requests (client_email, created_at);
CREATE INDEX IF NOT EXISTS booking_requests_dj_created_idx ON public.booking_requests (dj_id, created_at);
CREATE INDEX IF NOT EXISTS booking_requests_client_user_idx ON public.booking_requests (client_user_id);

CREATE POLICY "Bookers can view their own submitted requests"
  ON public.booking_requests FOR SELECT TO authenticated
  USING (client_user_id IS NOT NULL AND client_user_id = auth.uid());