
-- Add referral fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by text;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- Helper to generate a unique referral code from a name
CREATE OR REPLACE FUNCTION public.generate_referral_code(_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base text;
  _code text;
  _exists boolean;
  _attempts int := 0;
BEGIN
  -- Sanitize: lowercase alphanumeric, max 8 chars
  _base := lower(regexp_replace(COALESCE(_name, 'dj'), '[^a-zA-Z0-9]', '', 'g'));
  IF length(_base) = 0 THEN _base := 'dj'; END IF;
  IF length(_base) > 8 THEN _base := substring(_base, 1, 8); END IF;

  LOOP
    -- 4 random alphanumeric chars (uppercase)
    _code := _base || upper(substring(md5(random()::text || clock_timestamp()::text), 1, 4));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = _code) INTO _exists;
    EXIT WHEN NOT _exists OR _attempts > 10;
    _attempts := _attempts + 1;
  END LOOP;

  RETURN _code;
END;
$$;

-- Update handle_new_user to set referral_code + referred_by for DJs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _name text;
  _ref  text;
  _code text;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'dj'::public.app_role);
  _name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  _ref  := NULLIF(NEW.raw_user_meta_data->>'referred_by', '');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'dj' THEN
    _code := public.generate_referral_code(_name);

    -- Validate referral code exists; otherwise ignore
    IF _ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = _ref) THEN
      _ref := NULL;
    END IF;

    INSERT INTO public.profiles (user_id, name, stage_name, slug, referral_code, referred_by)
    VALUES (
      NEW.id,
      _name,
      _name,
      REPLACE(LOWER(_name), ' ', '-') || '-' || SUBSTRING(NEW.id::text, 1, 8),
      _code,
      _ref
    );
  ELSE
    INSERT INTO public.booker_profiles (user_id, full_name)
    VALUES (NEW.id, _name);
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill referral codes for any existing DJ profiles missing one
UPDATE public.profiles
SET referral_code = public.generate_referral_code(COALESCE(NULLIF(stage_name, ''), name))
WHERE referral_code IS NULL;
