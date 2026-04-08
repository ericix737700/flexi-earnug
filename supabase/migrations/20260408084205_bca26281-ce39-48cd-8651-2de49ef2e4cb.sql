
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_setting_key_unique UNIQUE (setting_key);
