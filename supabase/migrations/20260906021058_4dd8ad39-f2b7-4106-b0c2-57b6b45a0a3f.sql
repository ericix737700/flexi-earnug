CREATE POLICY "Withdrawal PINs are backend only"
ON public.withdrawal_pins
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);