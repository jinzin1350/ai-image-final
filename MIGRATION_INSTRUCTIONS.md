# Database Migration Instructions

## Add photo_type Column to brand_reference_photos Table

### Step 1: Run Migration SQL in Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the following SQL:

```sql
-- Add photo_type column to brand_reference_photos table
ALTER TABLE brand_reference_photos
ADD COLUMN IF NOT EXISTS photo_type VARCHAR(50) DEFAULT 'recreation';

-- Add check constraint to ensure only valid values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'brand_reference_photos_photo_type_check'
    ) THEN
        ALTER TABLE brand_reference_photos
        ADD CONSTRAINT brand_reference_photos_photo_type_check
        CHECK (photo_type IN ('recreation', 'style-transfer'));
    END IF;
END $$;

-- Create index for better performance when filtering by photo_type
CREATE INDEX IF NOT EXISTS idx_brand_reference_photos_photo_type ON brand_reference_photos(photo_type);

-- Update existing photos to be 'recreation' type (default behavior)
UPDATE brand_reference_photos SET photo_type = 'recreation' WHERE photo_type IS NULL;
```

4. Click **Run** to execute the migration
5. Verify the migration was successful (should see "Success. No rows returned")

### Step 2: Verify Migration

Run this query to verify the column was added:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'brand_reference_photos' AND column_name = 'photo_type';
```

You should see the `photo_type` column listed.

### Step 3: Restart Server

After running the migration, restart your Node.js server to ensure all changes take effect.

---

## What This Migration Does

- Adds `photo_type` column to distinguish between:
  - **'recreation'**: Single model photos used in Scene Recreation service
  - **'style-transfer'**: 2-person modeling photos used as content images in Style Transfer service
- Sets default value to 'recreation' for all existing photos
- Creates index for better query performance
- Adds check constraint to ensure only valid values

## Alternative: Use Migration Endpoint (if Supabase RPC is enabled)

If you have the `exec_sql` RPC function enabled in Supabase, you can also run:

```bash
curl -X POST http://localhost:5000/api/run-migration
```

This will execute the migration automatically.
