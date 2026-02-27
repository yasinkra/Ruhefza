-- Phase 8: Advanced Admin & Banning

-- 1. Add is_banned column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;

-- 2. Create system_settings table for global configurations
CREATE TABLE IF NOT EXISTS public.system_settings (
    id text PRIMARY KEY DEFAULT 'global',
    announcement_message text DEFAULT '',
    is_announcement_active boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now()
);

-- Insert default settings row
INSERT INTO public.system_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Select policy: viewable by all authenticated users
CREATE POLICY "Settings are viewable by all users" 
ON public.system_settings FOR SELECT 
USING (auth.role() = 'authenticated');

-- Update policy: only admins
CREATE POLICY "Only admins can update settings" 
ON public.system_settings FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 3. RPC: Toggle User Ban
CREATE OR REPLACE FUNCTION toggle_user_ban(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: only admin can ban
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only administrators can perform this action';
  END IF;

  UPDATE profiles 
  SET is_banned = NOT is_banned 
  WHERE id = target_user_id;
END;
$$;

-- 4. RPC: Update Announcement
CREATE OR REPLACE FUNCTION update_announcement(message text, active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: only admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only administrators can perform this action';
  END IF;

  UPDATE system_settings 
  SET announcement_message = message, 
      is_announcement_active = active,
      updated_at = now()
  WHERE id = 'global';
END;
$$;

-- 5. RPC: Get Admin Stats
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Security check
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only administrators can perform this action';
  END IF;

  SELECT json_build_object(
    'total_users', COALESCE((SELECT count(*) FROM profiles), 0),
    'active_users', COALESCE((SELECT count(*) FROM profiles WHERE is_banned = false), 0),
    'banned_users', COALESCE((SELECT count(*) FROM profiles WHERE is_banned = true), 0),
    'total_articles', COALESCE((SELECT count(*) FROM articles), 0),
    'total_posts', COALESCE((SELECT count(*) FROM posts), 0),
    'category_stats', (
      SELECT COALESCE(json_object_agg(category, count), '{}'::json)
      FROM (
        SELECT category, count(*) FROM articles GROUP BY category
      ) as cat_data
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 6. RPC: Search Users Admin
CREATE OR REPLACE FUNCTION search_user_admin(search_query text)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only administrators can perform this action';
  END IF;

  RETURN QUERY
  SELECT * FROM profiles
  WHERE 
    full_name ILIKE '%' || search_query || '%' OR 
    username ILIKE '%' || search_query || '%' OR
    custom_id::text = search_query OR
    id::text = search_query
  ORDER BY created_at DESC
  LIMIT 20;
END;
$$;
