
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_investor_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.owns_startup(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_dataroom_access(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.in_conversation(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_investor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_startup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_dataroom_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.in_conversation(uuid) TO authenticated;
