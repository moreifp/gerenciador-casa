CREATE TABLE public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  completed_by uuid,
  completed_at timestamptz NOT NULL DEFAULT now(),
  due_date date,
  proof_id uuid REFERENCES public.task_proofs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX task_completions_task_idx ON public.task_completions(task_id, completed_at DESC);
GRANT SELECT, INSERT ON public.task_completions TO authenticated;
GRANT ALL ON public.task_completions TO service_role;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage completions" ON public.task_completions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees read own completions" ON public.task_completions FOR SELECT TO authenticated
  USING (completed_by = auth.uid());
CREATE POLICY "Employees insert own completions" ON public.task_completions FOR INSERT TO authenticated
  WITH CHECK (completed_by = auth.uid());

ALTER TABLE public.task_proofs ADD COLUMN kind text NOT NULL DEFAULT 'completion';
ALTER TABLE public.whatsapp_messages ALTER COLUMN task_id DROP NOT NULL;
ALTER TABLE public.whatsapp_messages ADD COLUMN kind text;
ALTER TABLE public.whatsapp_messages ADD COLUMN ref_id text;
CREATE INDEX whatsapp_messages_ref_idx ON public.whatsapp_messages(kind, ref_id);

CREATE OR REPLACE FUNCTION public.call_send_whatsapp(_payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://kwrbzqaroxwxjvzcwmaj.supabase.co/functions/v1/send-whatsapp',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3cmJ6cWFyb3h3eGp2emN3bWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDAxNjMsImV4cCI6MjA4Nzk3NjE2M30.Y0XtccMNc3rR8FMNON6DIzm1DVzGdKaNjHsxcHiTWkc"}'::jsonb,
    body := _payload);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'call_send_whatsapp failed: %', SQLERRM;
END; $$;
REVOKE ALL ON FUNCTION public.call_send_whatsapp(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_task_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE _proof RECORD; _by uuid; _cid uuid;
BEGIN
  BEGIN
    SELECT id, submitted_by INTO _proof FROM public.task_proofs
     WHERE task_id = NEW.id AND kind = 'completion' AND created_at > now() - interval '10 minutes'
     ORDER BY created_at DESC LIMIT 1;
    _by := COALESCE(auth.uid(), _proof.submitted_by);
    INSERT INTO public.task_completions (task_id, completed_by, due_date, proof_id)
    VALUES (NEW.id, _by, NEW.due_date, _proof.id) RETURNING id INTO _cid;
    IF _by IS NOT NULL AND NOT public.has_role(_by, 'admin') THEN
      PERFORM public.call_send_whatsapp(jsonb_build_object('event','task_completed','completion_id',_cid));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'on_task_completed failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_task_completed AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.on_task_completed();

CREATE OR REPLACE FUNCTION public.on_task_question()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.kind = 'question' THEN
    PERFORM public.call_send_whatsapp(jsonb_build_object('event','task_question','proof_id',NEW.id));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'on_task_question failed: %', SQLERRM;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_task_question AFTER INSERT ON public.task_proofs
  FOR EACH ROW EXECUTE FUNCTION public.on_task_question();