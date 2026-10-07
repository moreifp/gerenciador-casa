-- Create document_category enum
CREATE TYPE public.document_category AS ENUM ('rg', 'cnh', 'ctps', 'contrato', 'atestado', 'comprovante_residencia', 'certidao', 'outro');

-- Create employee_documents table
CREATE TABLE public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  category document_category NOT NULL DEFAULT 'outro',
  label text,
  file_url text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Users read own documents or admin reads all
CREATE POLICY "Users read own documents" ON public.employee_documents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Users insert own documents or admin inserts for anyone
CREATE POLICY "Users insert own documents" ON public.employee_documents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Users or admin can delete documents
CREATE POLICY "Users delete own documents" ON public.employee_documents
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Storage policies for profile-documents bucket
CREATE POLICY "Users upload own profile docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Users read profile docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
