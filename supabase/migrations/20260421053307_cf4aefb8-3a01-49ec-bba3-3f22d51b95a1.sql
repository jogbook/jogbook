-- Create role enum
CREATE TYPE public.app_role AS ENUM ('dj', 'booker');

-- user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- booker_profiles table
CREATE TABLE public.booker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  company_or_event_type TEXT DEFAULT '',
  location TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bookers can view their own profile"
  ON public.booker_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Bookers can insert their own profile"
  ON public.booker_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Bookers can update their own profile"
  ON public.booker_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER booker_profiles_updated_at
BEFORE UPDATE ON public.booker_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add rate fields to dj profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rate TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rate_on_request BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stage_name TEXT DEFAULT '';

-- Replace handle_new_user to branch on role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _name text;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'dj'::public.app_role);
  _name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Always record the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'dj' THEN
    INSERT INTO public.profiles (user_id, name, stage_name, slug)
    VALUES (
      NEW.id,
      _name,
      _name,
      REPLACE(LOWER(_name), ' ', '-') || '-' || SUBSTRING(NEW.id::text, 1, 8)
    );
  ELSE
    INSERT INTO public.booker_profiles (user_id, full_name)
    VALUES (NEW.id, _name);
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();