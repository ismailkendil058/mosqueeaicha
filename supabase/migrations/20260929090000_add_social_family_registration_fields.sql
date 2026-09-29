ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS social_status text,
  ADD COLUMN IF NOT EXISTS family_status text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS siblings_count integer CHECK (siblings_count IS NULL OR siblings_count >= 0);
