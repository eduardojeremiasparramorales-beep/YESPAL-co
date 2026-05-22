INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) = 'eduardojeremiasparramorales@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles
WHERE role = 'customer'
  AND user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'eduardojeremiasparramorales@gmail.com');