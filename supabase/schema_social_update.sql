-- 1. Add social_links column as JSONB (flexible storage for key-value pairs)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- 2. Fix RLS Policies for UPDATE
-- First, drop existing update policy to be safe and avoid conflicts
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Re-create the update policy (Explicitly allowing update of own id row)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );

-- 3. Ensure SELECT is also correct (though usually it is public)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING ( true );
