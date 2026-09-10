
CREATE OR REPLACE FUNCTION public.startup_is_visible(_startup uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.startups s
    WHERE s.id = _startup AND (s.owner_id = auth.uid() OR s.status = 'approved' OR s.is_demo)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.startup_is_visible(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.startup_is_visible(uuid) TO authenticated;

CREATE POLICY "deck owner writes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pitch-decks' AND public.owns_startup(((storage.foldername(name))[1])::uuid));
CREATE POLICY "deck owner updates" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pitch-decks' AND public.owns_startup(((storage.foldername(name))[1])::uuid));
CREATE POLICY "deck owner deletes" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pitch-decks' AND public.owns_startup(((storage.foldername(name))[1])::uuid));
CREATE POLICY "deck readable" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pitch-decks' AND public.startup_is_visible(((storage.foldername(name))[1])::uuid));

CREATE POLICY "dataroom owner writes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dataroom' AND public.owns_startup(((storage.foldername(name))[1])::uuid));
CREATE POLICY "dataroom owner updates" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dataroom' AND public.owns_startup(((storage.foldername(name))[1])::uuid));
CREATE POLICY "dataroom owner deletes" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dataroom' AND public.owns_startup(((storage.foldername(name))[1])::uuid));
CREATE POLICY "dataroom readable with access" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dataroom' AND (public.owns_startup(((storage.foldername(name))[1])::uuid)
         OR public.has_dataroom_access(((storage.foldername(name))[1])::uuid)));
