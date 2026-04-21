-- Add press kit URL and SoundCloud URL columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS press_kit_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS soundcloud_url text DEFAULT '';

-- Create press-kits storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('press-kits', 'press-kits', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for press-kits bucket
-- Public can read
CREATE POLICY "Press kits are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'press-kits');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own press kit"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'press-kits'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update/replace their own press kit
CREATE POLICY "Users can update their own press kit"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'press-kits'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own press kit
CREATE POLICY "Users can delete their own press kit"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'press-kits'
  AND auth.uid()::text = (storage.foldername(name))[1]
);