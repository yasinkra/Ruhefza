-- Expert-Only Posting RLS Policy Update

-- Drop the existing insert policy if it exists (assuming it was "Users can insert their own posts")
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;

-- Create the new restrictive policy: Only Verified Teachers can insert posts
DROP POLICY IF EXISTS "Only verified experts can insert posts" ON public.posts;

CREATE POLICY "Only verified experts can insert posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role = 'teacher' 
      AND is_verified_expert = true
    )
  );
