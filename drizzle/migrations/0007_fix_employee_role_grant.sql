GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
INSERT INTO public.user_roles (user_id, role) VALUES ('1fd51412-fa1c-4a13-9423-a7cd333a9cff','employee') ON CONFLICT DO NOTHING;