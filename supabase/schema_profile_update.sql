-- 1. Create a sequence for the numeric ID (starts at 100000)
CREATE SEQUENCE IF NOT EXISTS public.custom_id_seq
    START WITH 100000
    INCREMENT BY 1;

-- 2. Add columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS custom_id BIGINT UNIQUE DEFAULT nextval('public.custom_id_seq'),
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS username_last_changed TIMESTAMP WITH TIME ZONE;

-- 3. Populate custom_id for existing users (if any exist without it)
-- Note: The DEFAULT above handles new inserts, but existing rows need this update.
UPDATE public.profiles 
SET custom_id = nextval('public.custom_id_seq') 
WHERE custom_id IS NULL;

-- 4. Create a function to safely update username with 1-month cooldown
CREATE OR REPLACE FUNCTION public.update_username(new_username TEXT, user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_profile RECORD;
    cooldown_period INTERVAL := INTERVAL '1 month';
BEGIN
    -- Get current profile
    SELECT * INTO current_profile FROM public.profiles WHERE id = user_id;

    -- Check if user exists
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kullanıcı bulunamadı.');
    END IF;

    -- Validate username format (min 3 chars, alphanumeric + underscore)
    IF NOT (new_username ~ '^[a-zA-Z0-9_]{3,20}$') THEN
         RETURN jsonb_build_object('success', false, 'message', 'Kullanıcı adı 3-20 karakter olmalı ve sadece harf, rakam ve alt çizgi içermelidir.');
    END IF;

    -- Check uniqueness
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username AND id != user_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bu kullanıcı adı zaten alınmış.');
    END IF;

    -- Check cooldown (allow if never changed, or if last change was > 1 month ago)
    IF current_profile.username_last_changed IS NOT NULL AND 
       current_profile.username_last_changed > (now() - cooldown_period) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Kullanıcı adı ayda sadece 1 kez değiştirilebilir. Son değişiklik: ' || to_char(current_profile.username_last_changed, 'DD.MM.YYYY')
        );
    END IF;

    -- Perform update
    UPDATE public.profiles
    SET username = new_username,
        username_last_changed = now()
    WHERE id = user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Kullanıcı adı başarıyla güncellendi.');
END;
$$;

-- 5. Update Search Policy (Optional but good practice)
-- Ensure RLS allows searching by these columns (already covered by "Public profiles are viewable by everyone")
