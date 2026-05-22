-- Assign admin to the existing user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) = 'eduardojeremiasparramorales@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure profile exists
INSERT INTO public.profiles (id, full_name, city)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email, 'Admin'), 'Bucaramanga'
FROM auth.users
WHERE lower(email) = 'eduardojeremiasparramorales@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- Install missing trigger so future signups get profile + default role
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();