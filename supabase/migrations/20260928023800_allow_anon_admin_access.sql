-- Migration to allow anon reading and updating of registrations for direct access admin
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO anon;

DROP POLICY IF EXISTS "admins can read registrations" ON public.registrations;
DROP POLICY IF EXISTS "admins can update registrations" ON public.registrations;
DROP POLICY IF EXISTS "everyone can read registrations" ON public.registrations;
DROP POLICY IF EXISTS "everyone can update registrations" ON public.registrations;

CREATE POLICY "everyone can read registrations" ON public.registrations
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "everyone can update registrations" ON public.registrations
  FOR UPDATE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admins can read student files" ON storage.objects;
DROP POLICY IF EXISTS "everyone can read student files" ON storage.objects;

CREATE POLICY "everyone can read student files" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('student-photos', 'birth-certificates'));
