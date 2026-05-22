
-- Fix search_path on helper trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoke public execute on functions only used by triggers/policies
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- has_role is used in RLS, keep accessible to authenticated but not anon
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- accept_order requires auth; restrict to authenticated only
REVOKE EXECUTE ON FUNCTION public.accept_order(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_order(UUID) TO authenticated;
