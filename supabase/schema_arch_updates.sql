-- Add is_verified_expert flag to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified_expert boolean DEFAULT false;

-- Add category to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS category text;

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('post', 'article')),
  item_id uuid NOT NULL, -- Logical reference to either posts.id or articles.id
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, item_type, item_id)
);

-- Enable RLS on bookmarks
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Bookmarks policies
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON public.bookmarks;

CREATE POLICY "Users can manage their own bookmarks"
  ON public.bookmarks
  USING ( auth.uid() = user_id );

-- Update profiles table custom_id (if not exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_id serial;

-- Note for the developer:
-- To execute this, please run these commands in the Supabase SQL Editor manually.
