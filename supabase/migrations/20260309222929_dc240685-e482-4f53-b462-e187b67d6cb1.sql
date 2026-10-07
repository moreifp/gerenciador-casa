
-- Add new columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

-- Create profile-photos bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create profile-documents bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-documents', 'profile-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for profile-photos: users can manage their own files, anyone can read (public bucket)
CREATE POLICY "Users upload own profile photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own profile photo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own profile photo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read profile photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-photos');

-- RLS for profile-documents: users manage own, admins read all
CREATE POLICY "Users upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "Users delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
