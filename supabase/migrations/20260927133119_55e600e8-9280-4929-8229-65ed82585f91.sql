
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  birth_date date NOT NULL,
  birth_place text NOT NULL,
  gender text NOT NULL,
  address text NOT NULL,
  notes text,
  education_level text NOT NULL,
  academic_year text NOT NULL,
  arrival_method text NOT NULL,
  vision_issue boolean NOT NULL DEFAULT false,
  hearing_issue boolean NOT NULL DEFAULT false,
  speech_issue boolean NOT NULL DEFAULT false,
  health_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  guardian_name text NOT NULL,
  guardian_relation text NOT NULL,
  guardian_phone text NOT NULL,
  guardian_email text,
  photo_url text NOT NULL,
  birth_certificate_url text NOT NULL,
  consent_given boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.registrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can submit registrations" ON public.registrations
  FOR INSERT TO anon, authenticated WITH CHECK (consent_given = true);
CREATE POLICY "admins can read registrations" ON public.registrations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can update registrations" ON public.registrations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can delete registrations" ON public.registrations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public can upload student files" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id IN ('student-photos', 'birth-certificates'));
CREATE POLICY "admins can read student files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('student-photos', 'birth-certificates') AND public.has_role(auth.uid(), 'admin'));
