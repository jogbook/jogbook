CREATE TYPE public.payout_method AS ENUM ('CARD', 'USDT', 'USDC', 'SOL', 'ETH');

ALTER TABLE public.payout_accounts
  ADD COLUMN IF NOT EXISTS payout_method public.payout_method NOT NULL DEFAULT 'CARD',
  ADD COLUMN IF NOT EXISTS wallet_address text,
  ADD COLUMN IF NOT EXISTS wallet_network text,
  ADD COLUMN IF NOT EXISTS wallet_asset text;