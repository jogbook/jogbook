ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepts_deposit boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deposit_type public.deposit_type NOT NULL DEFAULT 'PERCENTAGE'::public.deposit_type,
  ADD COLUMN IF NOT EXISTS deposit_percent numeric NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric;