
CREATE POLICY "Signed-in users read ad media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ads');

CREATE POLICY "Users upload own ad media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ads'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

CREATE POLICY "Users update own ad media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ads'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

CREATE POLICY "Users delete own ad media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ads'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );
