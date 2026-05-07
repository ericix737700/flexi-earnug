-- Add columns to withdrawals to track MarzPay payout
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS marzpay_reference text;

CREATE INDEX IF NOT EXISTS idx_withdrawals_transaction_id ON public.withdrawals (transaction_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_marzpay_reference ON public.withdrawals (marzpay_reference);

-- Seed kill-switch & withdrawal mode platform settings (idempotent)
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES
  ('maintenance_mode', 'false'),
  ('maintenance_message', 'We are performing scheduled maintenance. Please check back shortly.'),
  ('emergency_mode', 'false'),
  ('emergency_message', 'Emergency lockdown is active. All activity is temporarily paused.'),
  ('kill_deposits', 'false'),
  ('kill_withdrawals', 'false'),
  ('kill_tasks', 'false'),
  ('kill_rewards', 'false'),
  ('withdrawal_mode', 'manual')
ON CONFLICT (setting_key) DO NOTHING;