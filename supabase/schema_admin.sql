-- 1. Add is_admin flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create an RPC function to securely approve/reject a teacher
CREATE OR REPLACE FUNCTION approve_teacher_verification(teacher_id uuid, is_approved boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only administrators can perform this action';
  END IF;

  IF is_approved THEN
    -- Update profile to approved
    UPDATE profiles 
    SET verification_status = 'approved', 
        is_verified_expert = true 
    WHERE id = teacher_id AND role = 'teacher';
  ELSE
    -- Revert to unverified so they can upload again
    UPDATE profiles 
    SET verification_status = 'unverified', 
        is_verified_expert = false 
    WHERE id = teacher_id AND role = 'teacher';
  END IF;
END;
$$;
