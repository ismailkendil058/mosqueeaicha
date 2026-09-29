INSERT INTO storage.buckets (id, name, public)
VALUES
  ('student-photos', 'student-photos', false),
  ('birth-certificates', 'birth-certificates', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

DROP POLICY IF EXISTS "public can upload student files" ON storage.objects;
CREATE POLICY "public can upload student files" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id IN ('student-photos', 'birth-certificates'));

DROP POLICY IF EXISTS "everyone can read student files" ON storage.objects;
CREATE POLICY "everyone can read student files" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('student-photos', 'birth-certificates'));
