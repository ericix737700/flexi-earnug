
CREATE OR REPLACE FUNCTION public.protect_admin_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('suspended','blocked') AND public.has_role(NEW.user_id, 'admin'::app_role) THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_admin_status ON public.profiles;
CREATE TRIGGER trg_protect_admin_status
BEFORE INSERT OR UPDATE OF status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_admin_status();
