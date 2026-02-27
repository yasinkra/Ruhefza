-- Phase 6: User Category & Verification Updates

-- 1. Add verification_status and document URL to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('none', 'unverified', 'pending', 'approved'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_document_url text;

-- Note: 'none' for Parents, 'unverified' for new Teachers, 'pending' for Teachers with uploaded docs, 'approved' for Students (auto) and Verified Teachers.

-- 2. Update existing Posts RLS policy to allow Students and Approved Teachers to post
-- First, drop the old policies
DROP POLICY IF EXISTS "Only verified experts can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Professionals and Students can insert posts" ON public.posts;

-- Create the new expanded policy
CREATE POLICY "Professionals and Students can insert posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND (
        (role = 'teacher' AND verification_status = 'approved') OR
        (role = 'teacher' AND is_verified_expert = true) OR -- Fallback for previous system
        (role = 'student') -- Students are auto-approved
      )
    )
  );

-- 3. Create Storage Bucket for Verification Documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification_documents', 'verification_documents', false) -- Private bucket!
ON CONFLICT (id) DO NOTHING;

-- Policies for verification_documents
-- Allow users to upload their own documents
DROP POLICY IF EXISTS "Users can upload their own verification docs" ON storage.objects;
CREATE POLICY "Users can upload their own verification docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification_documents' AND
  auth.uid() = owner
);

-- Allow users to read their own documents
DROP POLICY IF EXISTS "Users can view their own verification docs" ON storage.objects;
CREATE POLICY "Users can view their own verification docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification_documents' AND
  auth.uid() = owner
);

-- Note: Admins would need a policy to view these docs too, assuming auth.uid() is an admin or using service role key in the backend.
