
-- Security definer function to get own profile id (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_own_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Allow users to see profiles of people they referred
CREATE POLICY "Users can view their referrals"
ON public.profiles
FOR SELECT
TO authenticated
USING (referred_by = public.get_own_profile_id());

-- New configurable settings
INSERT INTO public.platform_settings (setting_key, setting_value) VALUES
('community_whatsapp', ''),
('app_version', '1.0.0'),
('powered_by', 'Veltrix Technologies Ltd')
ON CONFLICT DO NOTHING;
