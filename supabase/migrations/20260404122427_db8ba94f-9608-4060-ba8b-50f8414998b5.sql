
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('task-videos', 'task-videos', true);

-- Branding bucket policies
CREATE POLICY "Anyone can view branding files"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Admins can upload branding files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update branding files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete branding files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Task videos bucket policies
CREATE POLICY "Anyone can view task videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-videos');

CREATE POLICY "Admins can upload task videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update task videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'task-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete task videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Add last_seen to profiles
ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Add admin SELECT policy for task_completions so admin can view user tasks
CREATE POLICY "Admins can view all task completions"
ON public.task_completions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
