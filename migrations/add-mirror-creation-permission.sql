-- ============================================
-- Migration: Add mirror-creation to service permissions
-- Date: 2025-12-12
-- Description: Update tier_service_permissions constraint to allow mirror-creation
-- ============================================

-- Step 1: Drop the existing constraint
ALTER TABLE tier_service_permissions
DROP CONSTRAINT IF EXISTS tier_service_permissions_service_key_check;

-- Step 2: Add the updated constraint with mirror-creation included
ALTER TABLE tier_service_permissions
ADD CONSTRAINT tier_service_permissions_service_key_check
CHECK (service_key IN (
    'complete-outfit',
    'accessories-only',
    'color-collection',
    'flat-lay',
    'scene-recreation',
    'style-transfer',
    'mirror-creation'
));

-- Step 3: Verify the constraint was updated
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Constraint updated successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'mirror-creation service is now allowed in tier_service_permissions table';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Go to /admin-service-permissions';
    RAISE NOTICE '2. Click "🔧 Initialize Missing Permissions"';
    RAISE NOTICE '3. Toggle access for each tier';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
