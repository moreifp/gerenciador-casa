
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- System/triggers can insert (use security definer functions)
CREATE POLICY "System inserts notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Index for fast lookups
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read) WHERE read = false;

-- Trigger function: notify assignees when a new task_assignee is created
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _task RECORD;
BEGIN
  SELECT title INTO _task FROM public.tasks WHERE id = NEW.task_id;
  INSERT INTO public.notifications (user_id, title, body, url)
  VALUES (NEW.user_id, 'Nova tarefa atribuída', COALESCE(_task.title, 'Tarefa'), '/tasks');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_assigned
  AFTER INSERT ON public.task_assignees
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assigned();

-- Trigger function: notify task creator when proof is submitted
CREATE OR REPLACE FUNCTION public.notify_proof_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _task RECORD;
  _submitter RECORD;
BEGIN
  SELECT title, created_by INTO _task FROM public.tasks WHERE id = NEW.task_id;
  SELECT full_name INTO _submitter FROM public.profiles WHERE id = NEW.submitted_by;
  IF _task.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, url)
    VALUES (
      _task.created_by,
      'Comprovação recebida',
      COALESCE(_submitter.full_name, 'Funcionário') || ' enviou comprovação para: ' || COALESCE(_task.title, 'Tarefa'),
      '/tasks'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_proof_submitted
  AFTER INSERT ON public.task_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_proof_submitted();
