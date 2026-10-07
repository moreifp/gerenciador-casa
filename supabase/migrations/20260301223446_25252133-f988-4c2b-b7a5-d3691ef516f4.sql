
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- Enum for task status
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');

-- Enum for recurrence
CREATE TYPE public.recurrence_type AS ENUM ('none', 'daily', 'weekly', 'monthly', 'custom');

-- Enum for task type
CREATE TYPE public.task_type AS ENUM ('routine', 'one_off');

-- Enum for invitation status
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired');

-- Enum for feedback action
CREATE TYPE public.feedback_action AS ENUM ('approved', 'reopened');

-- Enum for task priority
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  role_title TEXT,
  photo_url TEXT,
  admission_date DATE,
  bank_details JSONB DEFAULT '{}'::jsonb,
  documents JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type task_type NOT NULL DEFAULT 'one_off',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  status task_status NOT NULL DEFAULT 'pending',
  recurrence_type recurrence_type NOT NULL DEFAULT 'none',
  recurrence_days INT[] DEFAULT '{}',
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  audio_url TEXT,
  audio_transcription TEXT,
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Task assignees (N:N)
CREATE TABLE public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(task_id, user_id)
);
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Task proofs
CREATE TABLE public.task_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  photo_urls TEXT[] DEFAULT '{}',
  comment TEXT,
  audio_url TEXT,
  audio_transcription TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_proofs ENABLE ROW LEVEL SECURITY;

-- Task feedback
CREATE TABLE public.task_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  proof_id UUID REFERENCES public.task_proofs(id) ON DELETE SET NULL,
  action feedback_action NOT NULL,
  comment TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_feedback ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Security definer function to check roles
-- ==========================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ==========================================
-- Trigger to auto-create profile on signup
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- Trigger to auto-assign employee role when invitation is accepted
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation RECORD;
BEGIN
  SELECT * INTO _invitation FROM public.invitations
  WHERE email = NEW.email AND status = 'pending' AND expires_at > now()
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee')
    ON CONFLICT DO NOTHING;
    UPDATE public.invitations SET status = 'accepted' WHERE id = _invitation.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_check_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_signup();

-- ==========================================
-- RLS Policies
-- ==========================================

-- Profiles: users can read their own, admins can read all
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "System inserts profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- User roles: admins can read all, users can read own
CREATE POLICY "Read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Invitations: admins can CRUD, others can read their own invite
CREATE POLICY "Admins manage invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own invitation" ON public.invitations
  FOR SELECT TO anon
  USING (true);

-- Tasks: admins see all, employees see assigned
CREATE POLICY "Admins manage tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees read assigned tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_assignees
      WHERE task_assignees.task_id = tasks.id
      AND task_assignees.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees update assigned tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_assignees
      WHERE task_assignees.task_id = tasks.id
      AND task_assignees.user_id = auth.uid()
    )
  );

-- Task assignees
CREATE POLICY "Admins manage assignees" ON public.task_assignees
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees read own assignments" ON public.task_assignees
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Task proofs: admins see all, employees see own
CREATE POLICY "Admins manage proofs" ON public.task_proofs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees insert own proofs" ON public.task_proofs
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Employees read own proofs" ON public.task_proofs
  FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Task feedback: admins manage, employees read
CREATE POLICY "Admins manage feedback" ON public.task_feedback
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees read feedback" ON public.task_feedback
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_assignees
      WHERE task_assignees.task_id = task_feedback.task_id
      AND task_assignees.user_id = auth.uid()
    )
  );

-- ==========================================
-- Storage buckets
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('task-images', 'task-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('task-audio', 'task-audio', true);

-- Storage policies
CREATE POLICY "Authenticated users upload images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-images');

CREATE POLICY "Anyone can read images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'task-images');

CREATE POLICY "Authenticated users upload audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-audio');

CREATE POLICY "Anyone can read audio" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'task-audio');

-- ==========================================
-- Updated_at trigger for tasks
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
