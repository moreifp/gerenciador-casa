
-- Fix overly permissive INSERT policy - only triggers (SECURITY DEFINER) should insert
DROP POLICY "System inserts notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());
