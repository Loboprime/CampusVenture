REVOKE INSERT ON public.notifications FROM authenticated;
DROP POLICY IF EXISTS "notifications insert" ON public.notifications;