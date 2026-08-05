-- 1. Push subscription uniqueness
DELETE FROM public.push_subscriptions a USING public.push_subscriptions b
WHERE a.endpoint = b.endpoint AND a.ctid > b.ctid;
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);

-- 2. Notification preferences
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  wallet_deductions boolean NOT NULL DEFAULT true,
  reward_credits boolean NOT NULL DEFAULT true,
  investment_maturity boolean NOT NULL DEFAULT true,
  promotions boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_notif_prefs_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Account IDs
CREATE OR REPLACE FUNCTION public.generate_account_id()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := 'FE-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE account_id = candidate);
  END LOOP;
  RETURN candidate;
END; $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_id text;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE account_id IS NULL LOOP
    UPDATE public.profiles SET account_id = public.generate_account_id() WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles ALTER COLUMN account_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_account_id_key ON public.profiles (account_id);
ALTER TABLE public.profiles ALTER COLUMN account_id SET DEFAULT public.generate_account_id();

-- 4. News items
CREATE TABLE public.news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'news',
  image_url text,
  link_url text,
  is_published boolean NOT NULL DEFAULT true,
  pinned boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_items TO anon;
GRANT SELECT ON public.news_items TO authenticated;
GRANT ALL ON public.news_items TO service_role;
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published news" ON public.news_items
  FOR SELECT USING (is_published);
CREATE POLICY "Admins manage news" ON public.news_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_news_items_updated_at BEFORE UPDATE ON public.news_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Referrer preview lookup
CREATE OR REPLACE FUNCTION public.get_referrer_preview(_code text)
RETURNS TABLE(full_name text, account_id text, is_verified boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.full_name, p.account_id, p.is_verified
  FROM public.profiles p
  WHERE upper(p.referral_code) = upper(_code)
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_referrer_preview(text) TO anon, authenticated;