ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'SOL';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'ETH';

ALTER TABLE public.platform_settings
  ALTER COLUMN supported_payment_methods
  SET DEFAULT ARRAY['CARD','PAYPAL','USDC','USDT','BTC','SOL','ETH'];