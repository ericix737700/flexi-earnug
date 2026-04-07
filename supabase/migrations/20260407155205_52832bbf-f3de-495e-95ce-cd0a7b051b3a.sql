ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_fingerprint text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS restrictions jsonb DEFAULT '{}'::jsonb;