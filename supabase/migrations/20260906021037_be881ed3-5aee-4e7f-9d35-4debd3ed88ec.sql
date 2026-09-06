CREATE TABLE public.withdrawal_pins (
  user_id uuid PRIMARY KEY,
  pin_hash text NOT NULL,
  pin_salt text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.withdrawal_pins TO service_role;

ALTER TABLE public.withdrawal_pins ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_withdrawal_pins_updated_at
BEFORE UPDATE ON public.withdrawal_pins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.withdrawals
  ADD COLUMN fee_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN recipient_name text;

CREATE OR REPLACE FUNCTION public.create_secure_withdrawal(
  _user_id uuid,
  _amount numeric,
  _phone_number text,
  _network text,
  _recipient_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_minimum numeric := 5000;
  v_fee_enabled boolean := false;
  v_fee_percent numeric := 0;
  v_fee_minimum numeric := 0;
  v_fee numeric := 0;
  v_total numeric := 0;
  v_new_balance numeric := 0;
  v_withdrawal_id uuid;
BEGIN
  IF _user_id IS NULL OR _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount <> trunc(_amount) THEN
    RAISE EXCEPTION 'Enter a valid whole-number amount';
  END IF;
  IF _phone_number !~ '^[0-9+ ]{9,16}$' THEN
    RAISE EXCEPTION 'Enter a valid phone number';
  END IF;
  IF _network NOT IN ('MTN', 'Airtel') THEN
    RAISE EXCEPTION 'Unsupported mobile money network';
  END IF;
  IF char_length(trim(COALESCE(_recipient_name, ''))) < 2 OR char_length(trim(_recipient_name)) > 120 THEN
    RAISE EXCEPTION 'Verify the recipient name first';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_profile.status <> 'active' THEN RAISE EXCEPTION 'Your account is not active'; END IF;
  IF COALESCE((v_profile.restrictions->>'no_transactions')::boolean, false) THEN
    RAISE EXCEPTION 'Your account is restricted from making transactions';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.platform_settings
    WHERE setting_key IN ('emergency_mode', 'kill_withdrawals') AND lower(setting_value) = 'true'
  ) THEN
    RAISE EXCEPTION 'Withdrawals are temporarily disabled';
  END IF;

  SELECT COALESCE(NULLIF(setting_value, '')::numeric, 5000) INTO v_minimum
  FROM public.platform_settings WHERE setting_key = 'minimum_withdrawal';
  v_minimum := COALESCE(v_minimum, 5000);
  IF _amount < v_minimum THEN
    RAISE EXCEPTION 'Minimum withdrawal is UGX %', to_char(v_minimum, 'FM999,999,999');
  END IF;

  SELECT lower(setting_value) = 'true' INTO v_fee_enabled
  FROM public.platform_settings WHERE setting_key = 'withdrawal_fee_enabled';
  v_fee_enabled := COALESCE(v_fee_enabled, false);
  IF v_fee_enabled THEN
    SELECT COALESCE(NULLIF(setting_value, '')::numeric, 0) INTO v_fee_percent
    FROM public.platform_settings WHERE setting_key = 'withdrawal_fee_percent';
    SELECT COALESCE(NULLIF(setting_value, '')::numeric, 0) INTO v_fee_minimum
    FROM public.platform_settings WHERE setting_key = 'withdrawal_fee_min';
    v_fee := GREATEST(COALESCE(v_fee_minimum, 0), round(_amount * COALESCE(v_fee_percent, 0) / 100));
  END IF;
  v_total := _amount + v_fee;

  IF v_total > v_profile.balance THEN
    RAISE EXCEPTION 'Insufficient balance to cover the amount and processing fee';
  END IF;

  v_new_balance := v_profile.balance - v_total;
  UPDATE public.profiles SET balance = v_new_balance WHERE user_id = _user_id;

  INSERT INTO public.withdrawals (user_id, amount, fee_amount, phone_number, network, recipient_name)
  VALUES (_user_id, _amount, v_fee, regexp_replace(_phone_number, '[^0-9+]', '', 'g'), _network, trim(_recipient_name))
  RETURNING id INTO v_withdrawal_id;

  INSERT INTO public.transactions (
    user_id, transaction_type, amount, balance_after, description, reference_id
  ) VALUES (
    _user_id,
    'withdrawal',
    -v_total,
    v_new_balance,
    'Withdrawal to ' || trim(_recipient_name) || ' (' || _network || ' ' || regexp_replace(_phone_number, '[^0-9+]', '', 'g') || ')' ||
      CASE WHEN v_fee > 0 THEN ' — incl. UGX ' || to_char(v_fee, 'FM999,999,999') || ' processing fee' ELSE '' END,
    v_withdrawal_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'amount', _amount,
    'fee', v_fee,
    'total', v_total,
    'balance', v_new_balance
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_secure_withdrawal(uuid, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_secure_withdrawal(uuid, numeric, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.reject_secure_withdrawal(
  _withdrawal_id uuid,
  _admin_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_withdrawal public.withdrawals%ROWTYPE;
  v_new_balance numeric;
  v_refund numeric;
BEGIN
  IF NOT public.has_role(_admin_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF char_length(trim(COALESCE(_reason, ''))) < 3 OR char_length(trim(_reason)) > 500 THEN
    RAISE EXCEPTION 'A valid rejection reason is required';
  END IF;

  SELECT * INTO v_withdrawal FROM public.withdrawals
  WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_withdrawal.status <> 'pending' THEN RAISE EXCEPTION 'Only pending withdrawals can be rejected'; END IF;

  v_refund := v_withdrawal.amount + COALESCE(v_withdrawal.fee_amount, 0);
  UPDATE public.profiles
  SET balance = balance + v_refund
  WHERE user_id = v_withdrawal.user_id
  RETURNING balance INTO v_new_balance;

  UPDATE public.withdrawals SET
    status = 'rejected', rejection_reason = trim(_reason),
    processed_by = _admin_id, processed_at = now()
  WHERE id = _withdrawal_id;

  INSERT INTO public.transactions (
    user_id, transaction_type, amount, balance_after, description, reference_id
  ) VALUES (
    v_withdrawal.user_id, 'adjustment', v_refund, v_new_balance,
    'Withdrawal rejected: ' || trim(_reason), v_withdrawal.id::text
  );

  RETURN jsonb_build_object('success', true, 'refund', v_refund, 'balance', v_new_balance);
END;
$function$;

REVOKE ALL ON FUNCTION public.reject_secure_withdrawal(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_secure_withdrawal(uuid, uuid, text) TO service_role;