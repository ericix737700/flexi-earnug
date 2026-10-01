CREATE OR REPLACE FUNCTION public.refund_failed_withdrawal(
  _withdrawal_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_withdrawal public.withdrawals%ROWTYPE;
  v_refund numeric;
  v_new_balance numeric;
BEGIN
  IF char_length(trim(COALESCE(_reason, ''))) < 3 OR char_length(trim(_reason)) > 200 THEN
    RAISE EXCEPTION 'A valid failure reason is required';
  END IF;

  SELECT * INTO v_withdrawal
  FROM public.withdrawals
  WHERE id = _withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;

  IF v_withdrawal.status = 'rejected' THEN
    RETURN jsonb_build_object('success', true, 'already_refunded', true, 'refund', 0);
  END IF;

  IF v_withdrawal.status IN ('processed', 'completed') THEN
    RAISE EXCEPTION 'A completed payout cannot be refunded';
  END IF;

  v_refund := v_withdrawal.amount + COALESCE(v_withdrawal.fee_amount, 0);

  UPDATE public.profiles
  SET balance = balance + v_refund
  WHERE user_id = v_withdrawal.user_id
  RETURNING balance INTO v_new_balance;

  UPDATE public.withdrawals SET
    status = 'rejected',
    rejection_reason = left(trim(_reason), 200),
    processed_at = now()
  WHERE id = _withdrawal_id;

  INSERT INTO public.transactions (
    user_id, transaction_type, amount, balance_after, description, reference_id
  ) VALUES (
    v_withdrawal.user_id,
    'adjustment',
    v_refund,
    v_new_balance,
    'Withdrawal refund — payout failed: ' || trim(_reason),
    v_withdrawal.id::text
  );

  INSERT INTO public.notifications (
    user_id, title, message, notification_type
  ) VALUES (
    v_withdrawal.user_id,
    'Withdrawal Failed',
    'Your withdrawal of UGX ' || to_char(v_withdrawal.amount, 'FM999,999,999') || ' failed and UGX ' || to_char(v_refund, 'FM999,999,999') || ' has been refunded to your wallet.',
    'transaction'
  );

  RETURN jsonb_build_object('success', true, 'already_refunded', false, 'refund', v_refund, 'balance', v_new_balance);
END;
$function$;

REVOKE ALL ON FUNCTION public.refund_failed_withdrawal(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_failed_withdrawal(uuid, text) TO service_role;