CREATE TABLE public.task_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  phone text NOT NULL,
  text text,
  audio_url text,
  audio_transcription text,
  image_url text,
  zapi_message_id text,
  suggested_status text CHECK (suggested_status IN ('done','pending')),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX task_replies_task_idx ON public.task_replies(task_id, created_at DESC);
CREATE UNIQUE INDEX task_replies_zapi_idx ON public.task_replies(zapi_message_id) WHERE zapi_message_id IS NOT NULL;
GRANT SELECT, UPDATE ON public.task_replies TO authenticated;
GRANT ALL ON public.task_replies TO service_role;
ALTER TABLE public.task_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage replies" ON public.task_replies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees read own replies" ON public.task_replies FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.whatsapp_unmatched (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_unmatched TO authenticated;
GRANT ALL ON public.whatsapp_unmatched TO service_role;
ALTER TABLE public.whatsapp_unmatched ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read unmatched" ON public.whatsapp_unmatched FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.notify_task_reply() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE who text; t text;
BEGIN
  SELECT split_part(coalesce(full_name,'Funcionário'),' ',1) INTO who FROM profiles WHERE id = NEW.user_id;
  SELECT title INTO t FROM tasks WHERE id = NEW.task_id;
  INSERT INTO notifications(user_id, title, body, url)
  SELECT ur.user_id, '💬 ' || coalesce(who,'Funcionário') || coalesce(' — ' || t, ''),
         left(coalesce(NEW.text, NEW.audio_transcription, 'Resposta'), 200),
         CASE WHEN NEW.task_id IS NULL THEN '/' ELSE '/?open=' || NEW.task_id END
  FROM user_roles ur WHERE ur.role = 'admin';
  RETURN NEW;
END $$;
CREATE TRIGGER task_replies_notify AFTER INSERT ON public.task_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_reply();

ALTER TABLE public.task_replies REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_replies;