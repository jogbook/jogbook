-- ============ ENUMS ============
CREATE TYPE public.payment_type AS ENUM ('DEPOSIT', 'BALANCE', 'FULL');
CREATE TYPE public.payment_method AS ENUM ('CARD', 'PAYPAL', 'USDC', 'USDT', 'BTC');
CREATE TYPE public.payment_status AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE public.payout_status AS ENUM ('NOT_ELIGIBLE', 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED');
CREATE TYPE public.payout_account_status AS ENUM ('NOT_CONNECTED', 'ONBOARDING', 'PENDING_VERIFICATION', 'VERIFIED', 'PAYOUTS_ENABLED', 'RESTRICTED');
CREATE TYPE public.deposit_type AS ENUM ('PERCENTAGE', 'FIXED', 'FULL');
CREATE TYPE public.payout_timing AS ENUM ('IMMEDIATE', 'ON_GIG_COMPLETE', 'MANUAL');
CREATE TYPE public.booking_payment_state AS ENUM ('UNPAID', 'DEPOSIT_PAID', 'BALANCE_DUE', 'PAYMENT_COMPLETE', 'REFUNDED', 'CANCELLED');
CREATE TYPE public.booking_gig_state AS ENUM ('PENDING', 'CONFIRMED', 'GIG_COMPLETED', 'CANCELLED');

-- ============ PLATFORM SETTINGS (singleton) ============
CREATE TABLE public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true,
  commission_percent numeric(5,2) NOT NULL DEFAULT 5.00,
  default_deposit_percent numeric(5,2) NOT NULL DEFAULT 30.00,
  default_deposit_type public.deposit_type NOT NULL DEFAULT 'PERCENTAGE',
  payout_timing public.payout_timing NOT NULL DEFAULT 'ON_GIG_COMPLETE',
  supported_payment_methods text[] NOT NULL DEFAULT ARRAY['CARD','PAYPAL','USDC','USDT','BTC'],
  supported_currencies text[] NOT NULL DEFAULT ARRAY['USD','EUR','GBP','ZAR'],
  default_currency text NOT NULL DEFAULT 'USD',
  balance_due_days integer NOT NULL DEFAULT 7,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id),
  CONSTRAINT commission_range CHECK (commission_percent >= 0 AND commission_percent <= 100),
  CONSTRAINT deposit_range CHECK (default_deposit_percent >= 0 AND default_deposit_percent <= 100)
);

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read platform settings"
  ON public.platform_settings FOR SELECT TO authenticated USING (true);

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_settings (id) VALUES (true);

-- ============ BOOKING FINANCIALS ============
ALTER TABLE public.booking_requests
  ADD COLUMN client_user_id uuid,
  ADD COLUMN booking_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN performance_fee numeric(14,2),
  ADD COLUMN deposit_type public.deposit_type NOT NULL DEFAULT 'PERCENTAGE',
  ADD COLUMN deposit_value numeric(14,2) NOT NULL DEFAULT 30,
  ADD COLUMN deposit_amount numeric(14,2),
  ADD COLUMN balance_amount numeric(14,2),
  ADD COLUMN amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN payment_deadline timestamptz,
  ADD COLUMN terms text DEFAULT '',
  ADD COLUMN payment_state public.booking_payment_state NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN gig_state public.booking_gig_state NOT NULL DEFAULT 'PENDING',
  ADD COLUMN balance_requested_at timestamptz,
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN access_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX booking_requests_access_token_key ON public.booking_requests (access_token);

-- ============ PAYOUT ACCOUNTS ============
CREATE TABLE public.payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dj_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  connected_account_id text,
  status public.payout_account_status NOT NULL DEFAULT 'NOT_CONNECTED',
  country text,
  payout_currency text,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dj_id, provider)
);

GRANT SELECT ON public.payout_accounts TO authenticated;
GRANT ALL ON public.payout_accounts TO service_role;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DJs can view their own payout account"
  ON public.payout_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER payout_accounts_updated_at
  BEFORE UPDATE ON public.payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  dj_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_user_id uuid,
  client_email text NOT NULL DEFAULT '',
  payment_type public.payment_type NOT NULL,
  booking_amount numeric(14,2) NOT NULL,
  booking_currency text NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL,
  exchange_rate numeric(20,8) NOT NULL DEFAULT 1,
  payment_method public.payment_method NOT NULL,
  payment_status public.payment_status NOT NULL DEFAULT 'PENDING',
  provider text NOT NULL,
  provider_payment_id text,
  provider_checkout_url text,
  crypto_asset text,
  crypto_network text,
  crypto_amount numeric(30,10),
  crypto_address text,
  transaction_hash text,
  confirmation_status text,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  CONSTRAINT payments_amount_positive CHECK (amount > 0)
);

CREATE UNIQUE INDEX payments_provider_payment_id_key
  ON public.payments (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;
CREATE INDEX payments_booking_id_idx ON public.payments (booking_id);
CREATE INDEX payments_dj_id_idx ON public.payments (dj_id);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DJs can view payments for their bookings"
  ON public.payments FOR SELECT TO authenticated USING (public.is_profile_owner(dj_id));
CREATE POLICY "Clients can view their own payments"
  ON public.payments FOR SELECT TO authenticated USING (auth.uid() = client_user_id);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PAYOUTS ============
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  dj_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  gross_amount numeric(14,2) NOT NULL,
  platform_fee numeric(14,2) NOT NULL,
  platform_fee_percent numeric(5,2) NOT NULL,
  net_amount numeric(14,2) NOT NULL,
  currency text NOT NULL,
  payout_status public.payout_status NOT NULL DEFAULT 'NOT_ELIGIBLE',
  provider text NOT NULL DEFAULT 'stripe',
  connected_account_id text,
  provider_payout_id text,
  failure_reason text,
  eligible_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE UNIQUE INDEX payouts_payment_id_key ON public.payouts (payment_id) WHERE payment_id IS NOT NULL;
CREATE UNIQUE INDEX payouts_provider_payout_id_key
  ON public.payouts (provider, provider_payout_id)
  WHERE provider_payout_id IS NOT NULL;
CREATE INDEX payouts_dj_id_idx ON public.payouts (dj_id);

GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DJs can view their own payouts"
  ON public.payouts FOR SELECT TO authenticated USING (public.is_profile_owner(dj_id));

CREATE TRIGGER payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ WEBHOOK EVENTS (idempotency ledger) ============
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processing_status text NOT NULL DEFAULT 'received',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, event_id)
);

GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;