
-- 1. login_audit table
CREATE TABLE IF NOT EXISTS public.login_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'login',
  ip_address TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  isp TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_audit_user ON public.login_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_created ON public.login_audit(created_at DESC);

GRANT SELECT ON public.login_audit TO authenticated;
GRANT ALL ON public.login_audit TO service_role;

ALTER TABLE public.login_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all login audit"
ON public.login_audit FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own login audit"
ON public.login_audit FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. network_provider column on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS network_provider TEXT;

-- 3. Status override setting
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('status_override', 'auto')
ON CONFLICT (setting_key) DO NOTHING;
