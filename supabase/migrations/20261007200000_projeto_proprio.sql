-- Projeto Supabase próprio (fora do Lovable), 07/10/2026.
-- 1) Iniciais automáticas do perfil (existia no banco antigo, criada fora das migrations).
CREATE OR REPLACE FUNCTION public.recalc_profile_initials()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  first_w text;
  last_w text;
BEGIN
  IF NEW.full_name IS NULL OR btrim(NEW.full_name) = '' THEN
    NEW.initials := NULL;
    RETURN NEW;
  END IF;
  first_w := upper(substring(btrim(NEW.full_name) FROM 1 FOR 1));
  SELECT upper(substring(w.word FROM 1 FOR 1)) INTO last_w
  FROM unnest(string_to_array(btrim(NEW.full_name), ' ')) WITH ORDINALITY AS w(word, ord)
  WHERE btrim(w.word) <> ''
  ORDER BY w.ord DESC
  LIMIT 1;
  NEW.initials := first_w || COALESCE(last_w, 'X');
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_recalc_profile_initials ON public.profiles;
CREATE TRIGGER trg_recalc_profile_initials BEFORE INSERT OR UPDATE OF full_name ON public.profiles FOR EACH ROW EXECUTE FUNCTION recalc_profile_initials();

-- 2) Alertas de WhatsApp disparados pelo banco apontam para o projeto novo.
--    (chave anon é pública; é a mesma que vai no front)
CREATE OR REPLACE FUNCTION public.call_send_whatsapp(_payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://zbntjvgbghftpkwcgasr.supabase.co/functions/v1/send-whatsapp',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibnRqdmdiZ2hmdHBrd2NnYXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MDI1NTYsImV4cCI6MjEwNjk3ODU1Nn0._eFpdpWXbsXFFo8jgMj_8wshICXYvE3zd4mxrPQC7OM'),
    body := _payload);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'call_send_whatsapp failed: %', SQLERRM;
END; $$;
REVOKE ALL ON FUNCTION public.call_send_whatsapp(jsonb) FROM PUBLIC, anon, authenticated;
