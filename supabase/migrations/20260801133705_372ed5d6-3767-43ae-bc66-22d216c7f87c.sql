CREATE TYPE public.machine_status AS ENUM ('active','coming_soon','sold_out','disabled');
CREATE TYPE public.investment_status AS ENUM ('active','completed','cancelled','refunded');

CREATE TABLE public.investment_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  series text,
  description text,
  image_url text,
  price numeric NOT NULL DEFAULT 0,
  reward_amount numeric NOT NULL DEFAULT 0,
  duration_hours integer NOT NULL DEFAULT 24,
  status public.machine_status NOT NULL DEFAULT 'coming_soon',
  max_per_user integer NOT NULL DEFAULT 0,
  max_total integer NOT NULL DEFAULT 0,
  purchases_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.investment_machines TO authenticated;
GRANT ALL ON public.investment_machines TO service_role;
ALTER TABLE public.investment_machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view visible machines"
ON public.investment_machines FOR SELECT TO authenticated
USING (is_visible OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage machines"
ON public.investment_machines FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_investment_machines_updated_at
BEFORE UPDATE ON public.investment_machines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.investment_machines(id) ON DELETE RESTRICT,
  machine_name text NOT NULL,
  amount_paid numeric NOT NULL,
  reward_amount numeric NOT NULL,
  status public.investment_status NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  matures_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_investments_user ON public.user_investments(user_id);
CREATE INDEX idx_user_investments_due ON public.user_investments(status, matures_at);

GRANT SELECT ON public.user_investments TO authenticated;
GRANT ALL ON public.user_investments TO service_role;
ALTER TABLE public.user_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own investments"
ON public.user_investments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_investments_updated_at
BEFORE UPDATE ON public.user_investments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.protect_investment_timers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'active' THEN
    NEW.starts_at := OLD.starts_at;
    NEW.matures_at := OLD.matures_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_investment_timers_trg
BEFORE UPDATE ON public.user_investments
FOR EACH ROW EXECUTE FUNCTION public.protect_investment_timers();

CREATE TABLE public.investment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  investment_id uuid,
  machine_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.investment_audit_log TO authenticated;
GRANT ALL ON public.investment_audit_log TO service_role;
ALTER TABLE public.investment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read investment audit log"
ON public.investment_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_investments;