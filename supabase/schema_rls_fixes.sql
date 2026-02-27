-- Posts Update and Delete Policies

-- Allow users to update their own posts
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING ( auth.uid() = author_id );

-- Allow users to delete their own posts
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING ( auth.uid() = author_id );

-- Note: These policies ensure users have full control over the content they create.
-- Execute this script in your Supabase SQL Editor.
