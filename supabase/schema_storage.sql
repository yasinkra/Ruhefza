-- Feed Images Storage Bucket Setup
-- Create a new public storage bucket for community post images

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for 'post-images' bucket

-- 1. Anyone (including authenticated users) can view images
DROP POLICY IF EXISTS "Public Access for Post Images" ON storage.objects;

CREATE POLICY "Public Access for Post Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'post-images' );

-- 2. Only Authenticated Teachers (verified experts) can upload images
DROP POLICY IF EXISTS "Verified Experts can upload post images" ON storage.objects;

CREATE POLICY "Verified Experts can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
    AND profiles.is_verified_expert = true
  )
);

-- 3. Users can only delete their own uploaded images
DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;

CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-images' AND 
  auth.uid() = owner
);

-- Add image_url to Posts Table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;
