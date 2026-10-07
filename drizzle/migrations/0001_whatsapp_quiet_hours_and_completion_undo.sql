ALTER TABLE public.whatsapp_messages ADD COLUMN scheduled_for timestamptz;
CREATE INDEX whatsapp_messages_queue_idx ON public.whatsapp_messages(status, scheduled_for) WHERE status = 'queued';

ALTER TABLE public.task_completions ADD COLUMN undone_at timestamptz;
GRANT UPDATE ON public.task_completions TO authenticated;
CREATE POLICY "Employees update own completions" ON public.task_completions FOR UPDATE TO authenticated
  USING (completed_by = auth.uid()) WITH CHECK (completed_by = auth.uid());

CREATE OR REPLACE FUNCTION public.on_task_uncompleted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  UPDATE public.task_completions SET undone_at = now()
   WHERE id = (SELECT id FROM public.task_completions
                WHERE task_id = NEW.id AND undone_at IS NULL AND completed_at > now() - interval '10 minutes'
                ORDER BY completed_at DESC LIMIT 1);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'on_task_uncompleted failed: %', SQLERRM;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_task_uncompleted AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW WHEN (OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.on_task_uncompleted();