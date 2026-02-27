-- Phase 6/7: Admin Delete Permissions

-- Update POSTS table delete policy
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts or admins can delete any post" ON public.posts;
CREATE POLICY "Users can delete their own posts or admins can delete any post"
ON public.posts FOR DELETE
USING (
  auth.uid() = author_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Update ARTICLES table delete policy (assuming only admins or authors can delete)
DROP POLICY IF EXISTS "Admins can delete articles" ON public.articles;
DROP POLICY IF EXISTS "Authors can delete their own articles" ON public.articles;
DROP POLICY IF EXISTS "Authors or Admins can delete articles" ON public.articles;
CREATE POLICY "Authors or Admins can delete articles"
ON public.articles FOR DELETE
USING (
  auth.uid() = author_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
