
CREATE TYPE public.achievement_type AS ENUM ('first_task','tasks_count','login_streak','referrals','custom');

CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  achievement_type public.achievement_type NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 1,
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View active achievements" ON public.achievements FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage achievements" ON public.achievements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_achievements_updated_at BEFORE UPDATE ON public.achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.achievement_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  reward_amount NUMERIC NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.achievement_claims TO authenticated;
GRANT ALL ON public.achievement_claims TO service_role;
ALTER TABLE public.achievement_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own claims" ON public.achievement_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own claims" ON public.achievement_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.claim_achievement(_achievement_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_ach public.achievements%ROWTYPE;
  v_progress INTEGER := 0;
  v_new_balance NUMERIC;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO v_ach FROM public.achievements WHERE id = _achievement_id AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Achievement not available'); END IF;
  IF EXISTS (SELECT 1 FROM public.achievement_claims WHERE user_id = v_user AND achievement_id = v_ach.id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed'); END IF;

  IF v_ach.achievement_type IN ('first_task','tasks_count') THEN
    SELECT COUNT(*) INTO v_progress FROM public.task_completions WHERE user_id = v_user;
  ELSIF v_ach.achievement_type = 'login_streak' THEN
    SELECT COALESCE(daily_checkin_streak, 0) INTO v_progress FROM public.profiles WHERE user_id = v_user;
  ELSIF v_ach.achievement_type = 'referrals' THEN
    SELECT COUNT(*) INTO v_progress FROM public.profiles p WHERE p.referred_by = public.get_own_profile_id();
  ELSE v_progress := 0; END IF;

  IF v_progress < v_ach.threshold THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not yet eligible', 'progress', v_progress, 'threshold', v_ach.threshold); END IF;

  UPDATE public.profiles SET balance = balance + v_ach.reward_amount WHERE user_id = v_user RETURNING balance INTO v_new_balance;
  INSERT INTO public.achievement_claims (user_id, achievement_id, reward_amount) VALUES (v_user, v_ach.id, v_ach.reward_amount);
  INSERT INTO public.transactions (user_id, transaction_type, amount, balance_after, description, reference_id)
    VALUES (v_user, 'achievement', v_ach.reward_amount, v_new_balance, 'Achievement: ' || v_ach.title, v_ach.id::text);
  RETURN jsonb_build_object('success', true, 'reward', v_ach.reward_amount, 'balance', v_new_balance);
END; $$;

INSERT INTO public.achievements (key,title,description,achievement_type,threshold,reward_amount,icon,sort_order) VALUES
  ('first_task','First Steps','Complete your first task','first_task',1,500,'Sparkles',1),
  ('tasks_10','Getting Started','Complete 10 tasks','tasks_count',10,1500,'Target',2),
  ('tasks_50','Task Master','Complete 50 tasks','tasks_count',50,5000,'Trophy',3),
  ('tasks_100','Task Legend','Complete 100 tasks','tasks_count',100,12000,'Crown',4),
  ('streak_7','7-Day Streak','Log in 7 days in a row','login_streak',7,2000,'Flame',5),
  ('streak_30','30-Day Streak','Log in 30 days in a row','login_streak',30,10000,'Flame',6),
  ('ref_5','Rising Referrer','Refer 5 active users','referrals',5,3000,'Users',7),
  ('ref_25','Super Referrer','Refer 25 active users','referrals',25,15000,'Users',8),
  ('ref_100','Referral Champion','Refer 100 active users','referrals',100,60000,'Crown',9);

CREATE TABLE public.ad_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  days INTEGER NOT NULL CHECK (days > 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_packages TO authenticated;
GRANT ALL ON public.ad_packages TO service_role;
ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View active packages" ON public.ad_packages FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage packages" ON public.ad_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ad_packages_updated_at BEFORE UPDATE ON public.ad_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ad_packages (name, description, days, price, sort_order) VALUES
  ('Starter', 'Small campaign — 3 days visibility', 3, 15000, 1),
  ('Standard', 'Popular choice — 7 days visibility', 7, 30000, 2),
  ('Premium', 'Extended reach — 30 days visibility', 30, 100000, 3);

INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('ad_custom_day_rate','5000')
ON CONFLICT (setting_key) DO NOTHING;

CREATE TYPE public.ad_type AS ENUM ('banner','popup','inline','video','native','sponsored','notification');
CREATE TYPE public.ad_placement AS ENUM ('dashboard','tasks','popup','ads_page','all');
CREATE TYPE public.ad_status AS ENUM ('draft','pending_payment','pending_review','approved','rejected','active','paused','expired');
CREATE TYPE public.ad_payment_method AS ENUM ('balance','mobile_money','admin');

CREATE TABLE public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  cta_text TEXT DEFAULT 'Learn more',
  target_url TEXT,
  media_url TEXT,
  media_type TEXT DEFAULT 'image',
  ad_type public.ad_type NOT NULL DEFAULT 'banner',
  placement public.ad_placement NOT NULL DEFAULT 'dashboard',
  package_id UUID REFERENCES public.ad_packages(id) ON DELETE SET NULL,
  days INTEGER NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  payment_method public.ad_payment_method,
  paid BOOLEAN NOT NULL DEFAULT false,
  status public.ad_status NOT NULL DEFAULT 'pending_review',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  impression_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ads_status ON public.ads(status);
CREATE INDEX idx_ads_placement ON public.ads(placement);
CREATE INDEX idx_ads_user ON public.ads(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own and active ads" ON public.ads FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR (status = 'active' AND (end_date IS NULL OR end_date > now()))
    OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Create own ads" ON public.ads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Update own or admin ads" ON public.ads FOR UPDATE TO authenticated
  USING ((user_id = auth.uid() AND status IN ('draft','pending_payment','pending_review','rejected'))
    OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Delete own draft or admin" ON public.ads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin')
    OR (user_id = auth.uid() AND status IN ('draft','rejected')));
CREATE TRIGGER trg_ads_updated_at BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression','click')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_events_ad ON public.ad_events(ad_id);
GRANT SELECT, INSERT ON public.ad_events TO authenticated;
GRANT ALL ON public.ad_events TO service_role;
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View events (admin or ad owner)" ON public.ad_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_id AND a.user_id = auth.uid()));
CREATE POLICY "Record events" ON public.ad_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
