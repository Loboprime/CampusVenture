CREATE OR REPLACE FUNCTION private.has_dataroom_access(_startup uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.data_room_access a
    WHERE a.startup_id = _startup
      AND a.investor_id = (
        SELECT ip.id FROM public.investor_profiles ip WHERE ip.user_id = auth.uid() LIMIT 1
      )
      AND a.status = 'granted'
      AND EXISTS (
        SELECT 1 FROM public.nda_records n
        WHERE n.startup_id = a.startup_id
          AND n.investor_id = a.investor_id
          AND n.status = 'accepted'
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION private.has_dataroom_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_dataroom_access(uuid) TO authenticated;

DROP POLICY IF EXISTS "founder decides access" ON public.data_room_access;
CREATE POLICY "founder decides access" ON public.data_room_access
FOR UPDATE TO authenticated
USING (private.owns_startup(startup_id))
WITH CHECK (private.owns_startup(startup_id));
CREATE POLICY "investor renews revoked access" ON public.data_room_access
FOR UPDATE TO authenticated
USING (investor_id = private.current_investor_id() AND status = 'revoked')
WITH CHECK (investor_id = private.current_investor_id() AND status = 'pending');

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, organization)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name',''),
          COALESCE(NEW.email,''),
          COALESCE(NEW.raw_user_meta_data->>'organization',''))
  ON CONFLICT (id) DO NOTHING;

  -- Signup metadata is user-controlled: new accounts cannot self-assign investor,
  -- university, or administrator privileges.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  INSERT INTO public.students (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''));
  RETURN NEW;
END; $$;