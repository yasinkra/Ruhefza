-- Add 'is_best_answer' column to post_comments

ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS is_best_answer BOOLEAN DEFAULT false;

-- Create policy allowing the post author to update comments to mark them as best answer
CREATE POLICY "Post authors can mark comments as best answer"
ON public.post_comments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE id = post_id
    AND author_id = auth.uid()
  )
);
