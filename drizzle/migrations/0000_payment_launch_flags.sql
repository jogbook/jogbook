ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS payments_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crypto_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enabled_providers text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_enabled_providers_check
  CHECK (enabled_providers <@ ARRAY['STRIPE','PAYPAL','CRYPTO']::text[]);