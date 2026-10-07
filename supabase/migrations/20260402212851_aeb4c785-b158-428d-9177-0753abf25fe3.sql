
-- Create expense_type enum
CREATE TYPE public.expense_type AS ENUM ('reimbursement', 'company_money');

-- Create expense_status enum
CREATE TYPE public.expense_status AS ENUM ('pending', 'approved', 'rejected');

-- Create expense_reports table
CREATE TABLE public.expense_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status expense_status NOT NULL DEFAULT 'pending',
  receipt_photo_urls TEXT[] DEFAULT '{}'::text[],
  description TEXT,
  expense_type expense_type NOT NULL DEFAULT 'reimbursement',
  amount_spent NUMERIC(10,2),
  amount_received NUMERIC(10,2),
  change_amount NUMERIC(10,2),
  vendor_name TEXT,
  receipt_date DATE,
  ocr_raw_text TEXT,
  admin_comment TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.expense_reports ENABLE ROW LEVEL SECURITY;

-- RLS: employees CRUD own records
CREATE POLICY "Users read own expenses"
  ON public.expense_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own expenses"
  ON public.expense_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own pending expenses"
  ON public.expense_reports FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete own pending expenses"
  ON public.expense_reports FOR DELETE TO authenticated
  USING ((user_id = auth.uid() AND status = 'pending') OR has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_expense_reports_updated_at
  BEFORE UPDATE ON public.expense_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public) VALUES ('receipt-images', 'receipt-images', true);

-- Storage RLS for receipt-images
CREATE POLICY "Authenticated users upload receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipt-images');

CREATE POLICY "Public read receipts"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'receipt-images');
