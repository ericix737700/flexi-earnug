ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS creator_name text, ADD COLUMN IF NOT EXISTS creator_avatar_url text;

CREATE TABLE public.video_likes (user_id uuid NOT NULL, task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, task_id));
GRANT SELECT, INSERT, DELETE ON public.video_likes TO authenticated;
GRANT ALL ON public.video_likes TO service_role;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read likes" ON public.video_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own like insert" ON public.video_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own like delete" ON public.video_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.video_comments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, author_name text, body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, DELETE ON public.video_comments TO authenticated;
GRANT ALL ON public.video_comments TO service_role;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read comments" ON public.video_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own comment insert" ON public.video_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own or admin comment delete" ON public.video_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.creator_follows (user_id uuid NOT NULL, creator_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, creator_name));
GRANT SELECT, INSERT, DELETE ON public.creator_follows TO authenticated;
GRANT ALL ON public.creator_follows TO service_role;
ALTER TABLE public.creator_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own follows read" ON public.creator_follows FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own follows insert" ON public.creator_follows FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own follows delete" ON public.creator_follows FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_video_stats()
RETURNS TABLE(task_id uuid, views bigint, likes bigint, comments bigint, completions bigint, rewards_paid numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT t.id,
    (SELECT count(DISTINCT s.user_id) FROM public.task_starts s WHERE s.task_id = t.id),
    (SELECT count(*) FROM public.video_likes l WHERE l.task_id = t.id),
    (SELECT count(*) FROM public.video_comments c WHERE c.task_id = t.id),
    (SELECT count(*) FROM public.task_completions tc WHERE tc.task_id = t.id),
    (SELECT COALESCE(sum(tc.reward_earned),0) FROM public.task_completions tc WHERE tc.task_id = t.id)
  FROM public.tasks t WHERE t.task_type = 'video' AND auth.uid() IS NOT NULL
$$;
GRANT EXECUTE ON FUNCTION public.get_video_stats() TO authenticated;