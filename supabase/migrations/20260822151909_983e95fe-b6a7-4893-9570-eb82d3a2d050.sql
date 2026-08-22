ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS deposit_payment_status public.payment_status NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS deposit_paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deposit_payment_method public.payment_method;

-- Backfill from existing payments
WITH latest AS (
  SELECT DISTINCT ON (booking_id)
    booking_id, payment_status, payment_method, amount, booking_amount, paid_at
  FROM public.payments
  WHERE payment_type IN ('DEPOSIT', 'FULL')
  ORDER BY booking_id,
    CASE WHEN payment_status = 'PAID' THEN 0 ELSE 1 END,
    created_at DESC
)
UPDATE public.booking_requests b
SET deposit_payment_status = l.payment_status,
    deposit_payment_method = l.payment_method,
    deposit_paid_amount = CASE WHEN l.payment_status = 'PAID' THEN l.booking_amount ELSE 0 END,
    deposit_paid_at = l.paid_at
FROM latest l
WHERE l.booking_id = b.id;