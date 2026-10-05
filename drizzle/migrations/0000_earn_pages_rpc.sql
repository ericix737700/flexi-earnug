ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS min_watch_seconds integer NOT NULL DEFAULT 30;

CREATE TABLE public.task_starts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.task_starts TO authenticated;
GRANT ALL ON public.task_starts TO service_role;
ALTER TABLE public.task_starts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own task starts" ON public.task_starts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX ON public.task_starts (user_id, task_id, started_at DESC);

CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.survey_responses TO authenticated;
GRANT ALL ON public.survey_responses TO service_role;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own survey responses" ON public.survey_responses FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all survey responses" ON public.survey_responses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.start_task(_task_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE id = _task_id AND is_active) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not available'); END IF;
  INSERT INTO public.task_starts (user_id, task_id) VALUES (v_user, _task_id);
  RETURN jsonb_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_task(_task_id uuid, _answers jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_task public.tasks%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_started timestamptz;
  v_qcount int := 0;
  v_i int;
  v_ans jsonb;
  v_new_balance numeric;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = _task_id AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Task not available'); END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND OR v_profile.status <> 'active' OR NOT v_profile.registration_paid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your account must be active to earn'); END IF;
  IF COALESCE((v_profile.restrictions->>'no_tasks')::boolean, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your account is restricted from tasks'); END IF;
  IF EXISTS (SELECT 1 FROM public.platform_settings WHERE setting_key IN ('emergency_mode','kill_tasks','kill_rewards') AND lower(setting_value) = 'true') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Earning is temporarily paused'); END IF;
  IF EXISTS (SELECT 1 FROM public.task_completions WHERE user_id = v_user AND task_id = _task_id AND completed_at >= date_trunc('day', now())) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already completed today — come back tomorrow'); END IF;

  IF v_task.task_type = 'video' THEN
    SELECT max(started_at) INTO v_started FROM public.task_starts WHERE user_id = v_user AND task_id = _task_id AND started_at >= now() - interval '3 hours';
    IF v_started IS NULL OR now() - v_started < make_interval(secs => GREATEST(v_task.min_watch_seconds, 5) - 2) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Please watch the full video first'); END IF;
  ELSIF v_task.task_type = 'survey' THEN
    IF jsonb_typeof(v_task.survey_questions) = 'array' THEN v_qcount := jsonb_array_length(v_task.survey_questions); END IF;
    IF v_qcount = 0 THEN v_qcount := 1; END IF;
    IF _answers IS NULL OR jsonb_typeof(_answers) <> 'array' OR jsonb_array_length(_answers) < v_qcount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Please answer all questions'); END IF;
    FOR v_i IN 0..v_qcount-1 LOOP
      v_ans := _answers->v_i;
      IF v_ans IS NULL OR v_ans = 'null'::jsonb OR v_ans = '""'::jsonb OR v_ans = '[]'::jsonb OR length(v_ans::text) > 2000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please answer all questions'); END IF;
    END LOOP;
    INSERT INTO public.survey_responses (user_id, task_id, answers) VALUES (v_user, _task_id, _answers);
  END IF;

  UPDATE public.profiles SET balance = balance + v_task.reward_amount WHERE user_id = v_user RETURNING balance INTO v_new_balance;
  INSERT INTO public.task_completions (user_id, task_id, reward_earned) VALUES (v_user, _task_id, v_task.reward_amount);
  INSERT INTO public.transactions (user_id, transaction_type, amount, balance_after, description, reference_id)
    VALUES (v_user, 'earning', v_task.reward_amount, v_new_balance, initcap(v_task.task_type) || ' reward: ' || v_task.title, _task_id::text);
  RETURN jsonb_build_object('success', true, 'reward', v_task.reward_amount, 'balance', v_new_balance);
END; $$;

REVOKE EXECUTE ON FUNCTION public.start_task(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_task(uuid, jsonb) FROM anon;