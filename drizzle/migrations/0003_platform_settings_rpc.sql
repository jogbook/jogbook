CREATE OR REPLACE FUNCTION public.get_platform_settings()
RETURNS SETOF public.platform_settings
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.platform_settings WHERE id = true LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.get_platform_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_settings() TO authenticated, service_role;
DROP POLICY IF EXISTS "Signed-in users can read platform settings" ON public.platform_settings;