CREATE TYPE public.credit_card_type AS ENUM ('hipercard', 'pao_de_acucar', 'nubank', 'c6');

ALTER TABLE public.expense_reports ADD COLUMN credit_card credit_card_type;