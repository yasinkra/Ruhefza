-- Phase 8: Final Permission & Security Consolidation

-- ==========================================
-- 1. POSTS TABLE: Ensure only verified can INSERT
-- ==========================================
-- Drop ALL previous insert policies to avoid "additive" bypasses
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Only verified experts can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Professionals and Students can insert posts" ON public.posts;

CREATE POLICY "Strict verified posting"
ON public.posts FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND (
      (role = 'teacher' AND (verification_status = 'approved' OR is_verified_expert = true)) OR
      (role = 'student')
    )
  )
);

-- Ensure authors AND admins can delete
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts or admins can delete any post" ON public.posts;
CREATE POLICY "Authors or Admins can delete posts"
ON public.posts FOR DELETE
USING (
  auth.uid() = author_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ==========================================
-- 2. ARTICLES TABLE: Ensure only verified can INSERT
-- ==========================================
DROP POLICY IF EXISTS "Authenticated users can create articles" ON public.articles;
DROP POLICY IF EXISTS "Professionals and Students can create articles" ON public.articles;

CREATE POLICY "Strict verified article creation"
ON public.articles FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND (
      (role = 'teacher' AND (verification_status = 'approved' OR is_verified_expert = true)) OR
      (role = 'student')
    )
  )
);

-- Ensure authors AND admins can delete
DROP POLICY IF EXISTS "Admins can delete articles" ON public.articles;
DROP POLICY IF EXISTS "Authors can delete their own articles" ON public.articles;
DROP POLICY IF EXISTS "Authors or Admins can delete articles" ON public.articles;
CREATE POLICY "Authors or Admins can delete articles"
ON public.articles FOR DELETE
USING (
  auth.uid() = author_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ==========================================
-- 3. STORAGE: Allow Admins to see verification docs
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all verification docs" ON storage.objects;
CREATE POLICY "Admins can view all verification docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification_documents' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
