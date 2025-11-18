-- ================================================
-- Fix RLS policies for models table to allow admin
-- ================================================
-- Admins should be able to create models for any user
-- ================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own models" ON models;

-- Create new INSERT policy that allows:
-- 1. Users to insert their own models
-- 2. Service role (admin) to insert for any user
CREATE POLICY "Users and admins can insert models"
ON models FOR INSERT
WITH CHECK (
    owner_user_id = auth.uid()
    OR
    auth.jwt() ->> 'role' = 'service_role'
);

-- Also update UPDATE policy to allow admins
DROP POLICY IF EXISTS "Users can update their own models" ON models;

CREATE POLICY "Users and admins can update models"
ON models FOR UPDATE
USING (
    owner_user_id = auth.uid()
    OR
    auth.jwt() ->> 'role' = 'service_role'
);

-- Also update DELETE policy to allow admins
DROP POLICY IF EXISTS "Users can delete their own models" ON models;

CREATE POLICY "Users and admins can delete models"
ON models FOR DELETE
USING (
    owner_user_id = auth.uid()
    OR
    auth.jwt() ->> 'role' = 'service_role'
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Updated RLS policies for models table';
    RAISE NOTICE '🔐 Admins can now create/update/delete models for any user';
    RAISE NOTICE '👤 Regular users can only manage their own models';
END $$;
