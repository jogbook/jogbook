-- Add banner_url column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url text DEFAULT '';

-- Create storage bucket for profile assets
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-assets', 'profile-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view profile assets
CREATE POLICY "Public read profile assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-assets');

-- Allow authenticated users to upload their own assets (folder = user_id)
CREATE POLICY "Users upload own profile assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own assets
CREATE POLICY "Users update own profile assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own assets
CREATE POLICY "Users delete own profile assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
