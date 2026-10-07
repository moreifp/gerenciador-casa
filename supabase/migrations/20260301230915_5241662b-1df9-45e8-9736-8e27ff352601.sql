
-- Allow admins to update any profile
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile or admin"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
