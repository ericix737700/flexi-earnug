
-- Fix referral lookup (RLS blocks unauthenticated profile reads)
CREATE OR REPLACE FUNCTION public.find_referrer_by_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE upper(referral_code) = upper(_code) LIMIT 1
$$;

-- Gift codes table
CREATE TABLE IF NOT EXISTS public.gift_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric NOT NULL CHECK (amount > 0),
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage gift codes"
ON public.gift_codes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_gift_codes_updated
BEFORE UPDATE ON public.gift_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Redemptions table
CREATE TABLE IF NOT EXISTS public.gift_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_code_id uuid NOT NULL REFERENCES public.gift_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gift_code_id, user_id)
);

ALTER TABLE public.gift_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions"
ON public.gift_code_redemptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all redemptions"
ON public.gift_code_redemptions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Atomic redeem function
CREATE OR REPLACE FUNCTION public.redeem_gift_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_gift public.gift_codes%ROWTYPE;
  v_new_balance numeric;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_gift FROM public.gift_codes
  WHERE upper(code) = upper(_code) FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid gift code');
  END IF;

  IF NOT v_gift.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift code is inactive');
  END IF;

  IF v_gift.expires_at IS NOT NULL AND v_gift.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift code has expired');
  END IF;

  IF v_gift.uses_count >= v_gift.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift code fully redeemed');
  END IF;

  IF EXISTS (SELECT 1 FROM public.gift_code_redemptions WHERE gift_code_id = v_gift.id AND user_id = v_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already redeemed this code');
  END IF;

  -- Credit balance
  UPDATE public.profiles SET balance = balance + v_gift.amount
  WHERE user_id = v_user
  RETURNING balance INTO v_new_balance;

  -- Insert redemption
  INSERT INTO public.gift_code_redemptions (gift_code_id, user_id, amount)
  VALUES (v_gift.id, v_user, v_gift.amount);

  -- Update uses count
  UPDATE public.gift_codes SET uses_count = uses_count + 1 WHERE id = v_gift.id;

  -- Record transaction
  INSERT INTO public.transactions (user_id, transaction_type, amount, balance_after, description, reference_id)
  VALUES (v_user, 'gift_code', v_gift.amount, v_new_balance, 'Gift code redeemed: ' || v_gift.code, v_gift.code);

  RETURN jsonb_build_object('success', true, 'amount', v_gift.amount, 'balance', v_new_balance);
END;
$$;
